# Socializer — LinkedIn Automation Platform Design

**Date:** 2026-08-09  
**Status:** Draft for review  
**Product:** Socializer (internal tool)

## 1. Problem & goal

Build an internal LinkedIn growth OS (2–5 seats) that matches the capability surface of tools like Snov / Expandi: cloud-run automation for outbound + engagement + content posting, plus DIY email enrichment — without depending on those vendors as the engine.

**Primary outcome:** pipeline (find → connect → message → meetings).  
**Secondary outcome:** engagement and high-performing organic posts.

## 2. Product decisions (locked)

| Decision | Choice |
|---|---|
| Audience | Internal team tool (not multi-tenant SaaS v1) |
| Goal mix | Pipeline-first + engagement support |
| Execution model | Snov-like **cloud browsers** (laptop can be closed) |
| Extension role | **Lead capture only** (not action runtime) |
| Seats | 2–5 LinkedIn accounts |
| Copy | Fully autonomous AI (invite notes, DMs, comments, posts, replies) with kill-switch + quality filters |
| Lead sources | LinkedIn/Sales Nav search + CSV/CRM import + email enrichment |
| Enrichment | CloakBrowser website scrape + pattern guess/verify; paid finder API later as optional fallback |
| Content | Full-auto: trend scout → AI post → publish → boost + auto-reply to comments |
| Build approach | DIY codebase; AI-assisted development |

## 3. How Snov actually works (reference)

Snov is **not** “browserless Chrome extension automation”:

1. **Extension** — prospecting/save leads while browsing LinkedIn.
2. **Cloud LinkedIn Automation** — connect LinkedIn credentials + location proxy; **their servers** run actions with a dedicated proxy per slot so campaigns continue when the laptop is off.

Socializer copies that split: extension for capture, cloud workers for actions.

## 4. Architecture

### 4.1 Components

1. **Web app (control plane)** — Next.js: auth, seats, proxies, lists, campaigns/sequences, content campaigns, enrichment jobs, safety limits, logs/analytics. Does **not** drive LinkedIn DOM directly.
2. **Worker fleet (action plane)** — Node.js BullMQ workers:
   - LinkedIn worker (sessionful, leased per seat)
   - Enrichment worker (stateless crawl jobs)
   - Content worker jobs (can share LinkedIn worker with job-type routing)
3. **Account connector** — encrypted credentials, proxy assignment, login health check, `needs_2fa` / `restricted` / `paused` states.
4. **Chrome MV3 extension** — “Save to Socializer” from LinkedIn / Sales Navigator pages only.
5. **AI package** — prompts + model client for messages, comments, posts, replies.
6. **BrowserAdapter** — pluggable browser launch:
   - **LinkedIn default:** Patchright + real Chrome + sticky proxy
   - **Enrichment default:** CloakBrowser + proxy pool (e.g. `cloak.2srv.io` or equivalent)
   - Per-seat override if one engine fails checkpoints

### 4.2 Data flow (outbound)

Lead source (search job / CSV / extension / enrichment) → `Lead` → enroll in `Sequence` → scheduler emits `ActionJob` within caps → LinkedIn worker executes under seat lease → result + audit → advance / stop on reply or failure class.

### 4.3 Data flow (content)

Niche keywords → trend scout jobs → score posts → AI draft `ContentPost` → publish job → boost jobs (engage related posts) + comment-reply jobs on own post → scorecard feeds topic picker.

### 4.4 Data flow (enrichment)

Lead company domain → CloakBrowser crawl (contact/about/team/footer/`mailto:`) → extract emails → pattern guess (`first.last@domain`, etc.) → verify → write `Lead.email` + status. Optional paid finder API behind feature flag (off in v1).

## 5. Tech stack (internet-verified, locked)

| Layer | Choice | Rationale |
|---|---|---|
| Language / monorepo | TypeScript, pnpm workspaces | One language for app, worker, extension; AI-friendly DIY |
| Control plane | Next.js | UI + API routes for control plane |
| DB | Postgres + Drizzle | Seats, sequences, audit; typed migrations |
| Queue | Redis + BullMQ | Standard for Playwright job fleets; separate worker process |
| LinkedIn browser | Patchright + Google Chrome | Strong 2026 open-source stealth benchmarks; real Chrome TLS |
| Enrichment browser | CloakBrowser | Stealth Chromium for hard sites; matches user’s proxy tooling |
| Extension | Chrome MV3 | Capture-only |
| AI | LLM API via `packages/ai` | Autonomous copy/posts/replies |
| Infra local | Docker Compose (Postgres + Redis + worker) | Reproducible DIY |

**Hard infra rules:**

- Never run browsers inside the Next.js request path.
- Sticky dedicated residential/ISP/mobile proxy **per LinkedIn seat**; geo + timezone match; no mid-session IP rotation.
- One **profile lease** per seat (only one worker drives a seat at a time).
- Persist browser profile/session storage per seat.
- LinkedIn navigation: `domcontentloaded`, not `networkidle`.
- Pin CloakBrowser binary version; run workers in Docker.

### 5.1 Repo layout

```
socializer/
  apps/web/           # Next.js control plane
  apps/worker/        # BullMQ consumers (LinkedIn, enrichment, content)
  apps/extension/     # MV3 capture-only
  packages/core/      # domain types, sequence FSM, caps, email guess
  packages/db/        # Drizzle schema + migrations
  packages/ai/        # prompts + model client
  packages/browser/   # BrowserAdapter (Patchright / CloakBrowser)
  docker-compose.yml
```

## 6. Domain model

- **Workspace** — single internal workspace in v1
- **User** — admin / member
- **LinkedInSeat** — encrypted creds, proxyId, timezone, limits, browserEngine override, session status (`healthy` | `needs_2fa` | `restricted` | `paused`)
- **Proxy** — host/port/auth/geo; 1:1 with seat for LinkedIn
- **Lead** — LinkedIn URL, identity fields, email, enrichmentStatus, custom fields
- **List** — named lead group
- **Campaign** — type `outbound` | `content`
- **Sequence** / **SequenceStep** — ordered steps + conditions
- **Enrollment** — Lead × Sequence state
- **ActionJob** — concrete worker unit
- **MessageEvent** — outbound/inbound / reply detection
- **ContentPost** — draft, published URL, metrics, topic source
- **TrendSnapshot** — scouted posts/topics + scores
- **AuditLog** — every attempt

### 6.1 Sequence step types (platform vision)

`profile_visit`, `follow`, `like_recent_post`, `comment_recent_post`, `connect`, `message`, `inmail`, `endorse_skill`, `find_email`, `send_email`, `withdraw_invite`, `wait`, `condition`, `publish_post`, `boost_engage`, `reply_to_comment`

## 7. Safety model

Safety is a first-class service:

- Per-seat caps (invites, messages, visits, likes, comments, posts, total) with **flexible random** daily targets
- Warm-up ramp for new seats
- Working hours bound to seat timezone
- Random jitter between actions
- Budget split between outbound vs content (configurable, default 60% outbound / 40% content)
- Auto-withdraw stale pending invites
- Global + per-seat kill switch
- On checkpoint/challenge/restriction → pause seat queue, set status, notify teammate
- Retries only for transient infra errors; no retry for business failures (`already_connected`, `invite_limit`, `restricted`)

## 8. Build slices

### Slice 1 — Core runtime + outbound + enrichment (first implementation)

**Goal:** Connect seats → import/capture leads → enrich emails → run `connect → (accept detection) → message` with autonomous AI copy → full audit trail.

Includes:

1. Web app: seats, proxies, lists, minimal sequence builder, enrollments, action log, kill-switch
2. Account connector + session persistence + lease lock
3. LinkedIn worker (Patchright): `profile_visit` (optional), `connect`, `message`, `withdraw_invite`, accept/reply detection
4. Scheduler + safety caps
5. Enrichment worker (CloakBrowser): scrape → guess → verify; paid API stubbed off
6. Capture-only extension
7. AI copy for invite note + follow-up DM (autonomous; store prompt/output on job)

**Success check:** one seat overnight enrolls ~50 leads, enriches a subset, sends connects within caps, messages acceptances, audit log complete.

### Slice 2 — Content growth engine

Trend scout → AI write → publish → boost related posts → auto-reply to comments → engagement scorecard → feed winners back into topic picker. Shares seat caps with outbound.

### Slice 3 — Full kitchen sink

Lead-targeted likes/comments/follows/endorsements, InMail, groups, multichannel email send, CRM sync, multi-seat rotation in one campaign, richer analytics.

### Slice 4 — Production hardening

Real SMTP + paid email-finder API, HubSpot CRM adapter, simple internal auth, LinkedIn login/session warm + reply/inbox detection, AI copy quality filters, and ops health endpoints. Fake/no-network defaults remain for CI.

## 9. Error handling

`ActionJob` states: `queued` → `running` → `succeeded` | `failed` | `skipped` | `cancelled`

- Enrichment failures do not block LinkedIn steps unless the step requires email
- Optional worker debug artifacts (screenshot/HTML snippet) stored privately for failed LinkedIn actions
- Seat readiness validated **before** browser launch (paused / 2FA / proxy mismatch)

## 10. Testing strategy

- **Unit:** sequence FSM, cap calculator, email parse/guess, budget split
- **Integration:** enqueue → fake BrowserAdapter → DB transitions
- **Worker smoke:** fixtures / staging seats only — no real network blasts in CI
- **Manual gate before first real seat:** login, 1 connect, 1 message, enrich 1 domain, 1 test post (slice 2)

## 11. Non-goals (v1 / slice 1)

- Public multi-tenant SaaS billing
- Depending on Expandi / Snov / PhantomBuster as runtime
- Extension-based action execution
- Guaranteed ban-proof automation (LinkedIn ToS risk remains; mitigations only)
- Building a full email ESP (enrichment yes; bulk email send later)

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| LinkedIn account restriction | Caps, warm-up, sticky geo proxies, kill-switch, pause on challenge |
| LinkedIn UI churn | Single adapter layer for selectors; fixture tests |
| CloakBrowser binary trust | Pin version, Docker, isolate credentials |
| Patchright/Cloak gaps | BrowserAdapter swap per seat |
| Autonomous AI low-quality spam | Quality filters, audit of prompts/outputs, kill-switch, brand voice rules |
| Impossible travel (home IP vs cloud) | Dedicated sticky proxy matching usual login location; avoid mixing manual home login with cloud without same geo |

## 13. Open implementation details (decided at plan time, not blockers)

- Exact LLM provider (OpenAI / Anthropic / etc.)
- Exact proxy vendor SKU (user-supplied; design assumes HTTP/SOCKS sticky endpoints)
- Auth for internal app (simple email/password or SSO later)
- Hosting target (single VPS vs small compose stack)

---

**Next step after approval:** write Slice 1 implementation plan under `docs/superpowers/plans/` using the writing-plans skill.
