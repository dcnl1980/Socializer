# Socializer Slice 2 — Real Browsers + Content Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire real BrowserAdapter engines (Patchright for LinkedIn, CloakBrowser for enrichment) and ship the content growth engine: trend scout → AI post → publish → boost + auto-replies.

**Architecture:** Extend `@socializer/browser` with session manager + action drivers; add `content_posts` / `trend_snapshots` tables; route new `ActionJob` step types through the LinkedIn worker; add Content UI/API. Fake engine remains default for CI.

**Tech Stack:** Existing monorepo + optional `patchright` / `cloakbrowser` deps; Vitest fake path mandatory.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-09-socializer-linkedin-automation-design.md` §4.3, §6, Slice 2
- Content actions share seat daily cap budget (default 60% outbound / 40% content)
- Autonomous AI posts/replies with prompt+output audit on jobs/posts
- `domcontentloaded` navigation; sticky proxy; one seat lease
- Never launch browsers in Next.js route handlers
- CI must pass with `BROWSER_ENGINE=fake` (no live LinkedIn in tests)
- Stay on branch `cursor/socializer-linkedin-automation-design-646d`

## File Structure

```
packages/browser/src/session.ts          # launch + persistent profile
packages/browser/src/patchright.ts       # Patchright launcher
packages/browser/src/cloak.ts            # CloakBrowser launcher (optional require)
packages/browser/src/linkedin-real.ts    # real DOM actions (guarded)
packages/browser/src/enrichment-real.ts  # real site crawl
packages/ai/src/content.ts               # post + reply writers
packages/db/src/schema.ts                # content_posts, trend_snapshots, seat budget fields
apps/worker/src/processors/content.ts    # scout/publish/boost/reply
apps/worker/src/processors/linkedin.ts   # handle new step types
apps/web/app/content/*                   # UI + APIs
```

---

### Task 1: Session manager + real engine launchers

**Files:**
- Create: `packages/browser/src/session.ts`, `patchright.ts`, `cloak.ts`
- Modify: `packages/browser/src/adapter.ts`, `types.ts`, `package.json`, `index.ts`
- Test: `packages/browser/src/session.test.ts`

**Interfaces:**
```ts
openPersistentSession(input: OpenSeatSessionInput & { headless?: boolean }): Promise<BrowserSession & { page: PageLike }>
parseProxyUrl(url: string): { server: string; username?: string; password?: string }
```

- [ ] **Step 1:** Add optional deps `patchright`, `cloakbrowser` to `@socializer/browser`
- [ ] **Step 2:** Implement `parseProxyUrl` + fake session tests
- [ ] **Step 3:** `createBrowserAdapter` tries Patchright/Cloak when engine set; throws clear error if binary missing unless `BROWSER_ENGINE=fake`
- [ ] **Step 4:** Commit `feat(browser): add persistent session manager and engine launchers`

---

### Task 2: Expand LinkedIn + enrichment action surfaces

**Files:**
- Modify: `packages/browser/src/types.ts`, `fake.ts`, `linkedin.ts`, `enrichment.ts`
- Create: `packages/browser/src/linkedin-real.ts`, `enrichment-real.ts`
- Test: extend `fake.test.ts`

**Interfaces:**
```ts
interface LinkedInActions {
  // existing...
  likePost(postUrl: string): Promise<ActionResult>;
  commentOnPost(postUrl: string, text: string): Promise<ActionResult>;
  publishPost(text: string): Promise<ActionResult & { postUrl?: string }>;
  scrapeTrending(keywords: string[], limit: number): Promise<Array<{ url: string; text: string; reactions: number; comments: number }>>;
  listOwnPostComments(postUrl: string): Promise<Array<{ id: string; author: string; text: string }>>;
  replyToComment(postUrl: string, commentId: string, text: string): Promise<ActionResult>;
}
```

- [ ] **Step 1:** Extend fake implementations with in-memory feed/posts/comments
- [ ] **Step 2:** Add real drivers that use session page when engine ≠ fake (selectors isolated; login helper)
- [ ] **Step 3:** Commit `feat(browser): content and engagement LinkedIn actions`

---

### Task 3: DB — content tables + seat budget fields

**Files:**
- Modify: `packages/db/src/schema.ts`
- Generate migration
- Test: migrate against local Postgres

Add:
- `linkedin_seats.outboundBudgetPercent` (default 60)
- `content_posts` (campaignId, seatId, status draft|scheduled|published|failed, topic, prompt, body, postUrl, metrics jsonb)
- `trend_snapshots` (seatId, keyword, payload jsonb, score, capturedAt)
- `content_campaigns` settings on `campaigns` via jsonb `config` column if missing

- [ ] **Step 1:** Schema + migrate
- [ ] **Step 2:** Commit `feat(db): content posts and trend snapshots`

---

### Task 4: AI content writers

**Files:**
- Create: `packages/ai/src/content.ts`
- Modify: `packages/ai/src/types.ts`, `stub.ts`, `index.ts`
- Test: `packages/ai/src/content.test.ts`

```ts
interface ContentWriter {
  draftPost(input: { niche: string; trendSummary: string; brandVoice: string }): Promise<CopyResult>;
  replyToComment(input: { postBody: string; comment: string }): Promise<CopyResult>;
  commentOnTrend(input: { postText: string; niche: string }): Promise<CopyResult>;
}
```

- [ ] **Step 1:** TDD stub writers
- [ ] **Step 2:** Commit `feat(ai): content post and reply writers`

---

### Task 5: Content worker processors + scheduler hooks

**Files:**
- Create: `apps/worker/src/processors/content.ts`
- Modify: `apps/worker/src/processors/linkedin.ts`, `scheduler.ts`, `queues.ts`, `index.ts`
- Test: `apps/worker/src/smoke/slice2.content.fake.test.ts`

Flow:
1. `content_scout` job → scrapeTrending → insert trend_snapshots → create draft content_post
2. `content_publish` → AI draft if needed → publishPost → store URL
3. `content_boost` → like/comment on top related trend posts (cap-aware)
4. `content_reply` → listOwnPostComments → AI reply → replyToComment

Budget: before spending, compute content vs outbound remaining from `splitBudget` + seat counters (`actionsUsedOutboundToday`, `actionsUsedContentToday` or derive from job step types).

- [ ] **Step 1:** Implement processors with fake actions
- [ ] **Step 2:** Smoke test full content loop
- [ ] **Step 3:** Commit `feat(worker): content scout publish boost reply pipeline`

---

### Task 6: Content control plane UI/API

**Files:**
- Create: `apps/web/app/content/page.tsx`
- Create: `apps/web/app/api/content/campaigns/route.ts`, `posts/route.ts`, `run/route.ts`
- Modify: `apps/web/app/layout.tsx` nav

APIs:
- `POST /api/content/campaigns` { name, seatId, keywords[], brandVoice }
- `GET /api/content/posts`
- `POST /api/content/run` { campaignId, phase: 'scout'|'publish'|'boost'|'reply'|'all' } → enqueue jobs only

- [ ] **Step 1:** APIs + page
- [ ] **Step 2:** Commit `feat(web): content campaign operator UI`

---

### Task 7: Docs + verification

- Update README with Slice 2 + real engine env vars (`BROWSER_ENGINE`, Chrome/Patchright notes)
- `pnpm test` + `pnpm --filter @socializer/web build`
- Push + update PR #2

---

## Execution

Execute Tasks 1–7 continuously after plan commit.
