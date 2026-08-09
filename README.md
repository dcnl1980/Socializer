# Socializer

Internal LinkedIn growth OS (Slice 1): cloud workers, sticky proxies, outbound `connect → message` sequences, DIY email enrichment, capture-only Chrome extension.

## Stack

- **Web:** Next.js control plane (`apps/web`)
- **Worker:** BullMQ + Patchright/CloakBrowser adapter (`apps/worker`)
- **DB/Queue:** Postgres + Redis
- **Packages:** `@socializer/core`, `@socializer/db`, `@socializer/browser`, `@socializer/ai`
- **Extension:** MV3 capture-only (`apps/extension`)

Design: `docs/superpowers/specs/2026-08-09-socializer-linkedin-automation-design.md`  
Plan: `docs/superpowers/plans/2026-08-09-socializer-slice1-core-outbound.md`

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
