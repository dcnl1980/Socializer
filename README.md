# Socializer

Internal LinkedIn growth OS (Slice 1): cloud workers, sticky proxies, outbound `connect → message` sequences, DIY email enrichment, capture-only Chrome extension.

## Stack

- **Web:** Next.js control plane (`apps/web`)
- **Worker:** BullMQ + Patchright/CloakBrowser adapter (`apps/worker`)
- **DB/Queue:** Postgres + Redis
- **Packages:** `@socializer/core`, `@socializer/db`, `@socializer/browser`, `@socializer/ai`
- **Extension:** MV3 capture-only (`apps/extension`)

Design: `docs/superpowers/specs/2026-08-09-socializer-linkedin-automation-design.md`  
Plans:
- Slice 1: `docs/superpowers/plans/2026-08-09-socializer-slice1-core-outbound.md`
- Slice 2: `docs/superpowers/plans/2026-08-09-socializer-slice2-browsers-content.md`

## Slice 2 — Content growth

Operator UI at `/content`:
1. Create a content campaign (keywords, niche, brand voice, seat)
2. **Run full loop** → scout trends → AI draft → publish → boost → reply
3. Caps: default **60% outbound / 40% content** per seat daily budget

## Real browsers

CI and local default use `BROWSER_ENGINE=fake`. On a worker host with Google Chrome + sticky proxy:

```bash
pnpm --filter @socializer/browser add patchright cloakbrowser
# set seat browserEngine to patchright (LinkedIn) or cloakbrowser (enrichment)
```

## Slice 3 — Kitchen sink

- Lead engagement: visit, follow, like/comment recent posts, endorse
- InMail + group engage
- Multichannel `find_email` / `send_email` (`@socializer/email`)
- CRM webhook sync (`CRM_WEBHOOK_URL`, UI at `/settings`)
- Multi-seat rotation via sequence `seatPool`
- Analytics at `/analytics`

## Slice 4 — Production hardening

- Real SMTP (`SMTP_URL` + optional `nodemailer`) and Hunter-style finder (`EMAIL_FINDER_API_KEY`)
- HubSpot CRM (`HUBSPOT_ACCESS_TOKEN`) or webhook fallback
- Optional app auth (`AUTH_PASSWORD`) → `/login`
- Seat **Warm** + inbox reply polling (`/inbox`)
- AI copy quality filters (banned phrases / length)
- Ops health: `GET /api/health`

## Quick start

```bash
cp .env.example .env
docker compose up -d
corepack enable
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm --filter @socializer/db seed
pnpm test
pnpm dev:web      # terminal 1
pnpm dev:worker   # terminal 2
```

Open http://localhost:3000 — create a seat (use `browserEngine: fake` locally), a list + leads, a sequence, enroll, then watch Jobs.

Load the extension from `apps/extension` (see its README).

## Safety

Daily caps, kill switch, seat pause, and seat leases are enforced in the worker. Real LinkedIn automation requires sticky residential/ISP proxies and carries LinkedIn ToS / ban risk.
