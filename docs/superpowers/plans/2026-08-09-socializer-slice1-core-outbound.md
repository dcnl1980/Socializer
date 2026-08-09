# Socializer Slice 1 — Core + Outbound + Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working internal Socializer Slice 1: connect LinkedIn seats, capture/import leads, enrich emails, run `connect → message` sequences with autonomous AI copy, safety caps, and audit logs.

**Architecture:** TypeScript pnpm monorepo. Next.js control plane enqueues BullMQ jobs; separate Node workers drive LinkedIn via BrowserAdapter (Patchright default) and enrichment via CloakBrowser; Postgres holds domain state; Redis queues work.

**Tech Stack:** TypeScript, pnpm, Next.js, Drizzle, Postgres, Redis, BullMQ, Vitest, Patchright, CloakBrowser, Chrome MV3 extension.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-09-socializer-linkedin-automation-design.md`
- Internal tool only (single workspace); 2–5 LinkedIn seats
- Cloud workers execute LinkedIn actions; extension is capture-only
- BrowserAdapter: Patchright+Chrome for LinkedIn; CloakBrowser for enrichment
- Never run browsers inside Next.js request handlers
- Sticky proxy per seat; one lease per seat; `domcontentloaded` not `networkidle`
- Autonomous AI copy with kill-switch; store prompt+output on ActionJob
- Enrichment: scrape + pattern guess/verify; paid finder API stubbed off
- Slice 1 excludes: content engine, InMail, groups, CRM sync, likes/comments on leads
- TDD for `packages/core` and queue state transitions; frequent commits
- Branch naming already in use: stay on current feature branch

## File Structure

```
socializer/
  package.json                 # pnpm workspaces root
  pnpm-workspace.yaml
  turbo.json                   # optional; scripts may use pnpm -r
  docker-compose.yml           # postgres + redis
  .env.example
  apps/web/                    # Next.js control plane
  apps/worker/                 # BullMQ consumers
  apps/extension/              # MV3 capture-only
  packages/core/               # caps, sequence FSM, email guess, types
  packages/db/                 # drizzle schema + client
  packages/ai/                 # copy generation interface + stub/openai
  packages/browser/            # BrowserAdapter + fake + patchright/cloak stubs
```

---

### Task 1: Monorepo scaffold + Vitest

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `docker-compose.yml`
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`, `packages/core/src/index.ts`
- Test: `packages/core/src/health.test.ts`

**Interfaces:**
- Produces: runnable `pnpm install` + `pnpm --filter @socializer/core test`

- [ ] **Step 1: Write root workspace files**

```json
// package.json
{
  "name": "socializer",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "test": "pnpm -r --if-present test",
    "typecheck": "pnpm -r --if-present typecheck",
    "dev:web": "pnpm --filter @socializer/web dev",
    "dev:worker": "pnpm --filter @socializer/worker dev",
    "db:generate": "pnpm --filter @socializer/db generate",
    "db:migrate": "pnpm --filter @socializer/db migrate"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

```gitignore
node_modules
dist
.next
.env
.env.local
coverage
*.log
.playwright
profiles
```

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: socializer
      POSTGRES_PASSWORD: socializer
      POSTGRES_DB: socializer
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  pgdata:
```

```bash
# .env.example
DATABASE_URL=postgres://socializer:socializer@localhost:5432/socializer
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=dev-only-change-me-32chars-minimum!!
OPENAI_API_KEY=
ENRICHMENT_PROXY_URL=
```

- [ ] **Step 2: Scaffold `@socializer/core` with a trivial passing test**

```ts
// packages/core/src/health.test.ts
import { describe, expect, it } from "vitest";
import { health } from "./health.js";

describe("health", () => {
  it("returns ok", () => {
    expect(health()).toEqual({ ok: true });
  });
});
```

```ts
// packages/core/src/health.ts
export function health() {
  return { ok: true as const };
}
```

```ts
// packages/core/src/index.ts
export { health } from "./health.js";
```

```json
// packages/core/package.json
{
  "name": "@socializer/core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  }
}
```

```json
// packages/core/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

```ts
// packages/core/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

- [ ] **Step 3: Install and run tests**

Run:
```bash
corepack enable && pnpm install && pnpm --filter @socializer/core test
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .env.example docker-compose.yml packages/core pnpm-lock.yaml
git commit -m "chore: scaffold pnpm monorepo with core package"
```

---

### Task 2: Safety caps + sequence FSM in `@socializer/core`

**Files:**
- Create: `packages/core/src/types.ts`, `packages/core/src/caps.ts`, `packages/core/src/sequence.ts`, `packages/core/src/email.ts`
- Test: `packages/core/src/caps.test.ts`, `packages/core/src/sequence.test.ts`, `packages/core/src/email.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces:
  - `pickDailyCap(min: number, max: number, rng?: () => number): number`
  - `canSpend(used: number, cap: number, cost?: number): boolean`
  - `nextEnrollmentAction(input): { type: 'run_step' | 'wait' | 'complete' | 'stop'; stepIndex?: number; reason?: string }`
  - `guessEmails(firstName, lastName, domain): string[]`
  - `extractEmails(text: string): string[]`

- [ ] **Step 1: Write failing caps tests**

```ts
// packages/core/src/caps.test.ts
import { describe, expect, it } from "vitest";
import { canSpend, pickDailyCap } from "./caps.js";

describe("pickDailyCap", () => {
  it("returns value within inclusive range", () => {
    const value = pickDailyCap(10, 20, () => 0.5);
    expect(value).toBeGreaterThanOrEqual(10);
    expect(value).toBeLessThanOrEqual(20);
  });

  it("returns min when rng is 0", () => {
    expect(pickDailyCap(5, 15, () => 0)).toBe(5);
  });
});

describe("canSpend", () => {
  it("allows spend under cap", () => {
    expect(canSpend(3, 10, 1)).toBe(true);
  });
  it("blocks spend at cap", () => {
    expect(canSpend(10, 10, 1)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm --filter @socializer/core test`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement caps**

```ts
// packages/core/src/caps.ts
export function pickDailyCap(
  min: number,
  max: number,
  rng: () => number = Math.random,
): number {
  if (max < min) throw new Error("max must be >= min");
  const span = max - min;
  return min + Math.floor(rng() * (span + 1));
}

export function canSpend(used: number, cap: number, cost = 1): boolean {
  return used + cost <= cap;
}
```

- [ ] **Step 4: Write sequence + email tests and implement**

```ts
// packages/core/src/types.ts
export type StepType =
  | "profile_visit"
  | "connect"
  | "message"
  | "withdraw_invite"
  | "find_email"
  | "wait"
  | "condition";

export type SequenceStep = {
  type: StepType;
  delayMinutes?: number;
  condition?: "connected" | "replied" | "has_email";
  onTrueNext?: number;
  onFalseNext?: number;
};

export type EnrollmentSnapshot = {
  stepIndex: number;
  connected: boolean;
  replied: boolean;
  hasEmail: boolean;
  lastStepCompletedAt: Date | null;
  status: "active" | "completed" | "stopped" | "paused";
  now: Date;
};
```

```ts
// packages/core/src/sequence.ts
import type { EnrollmentSnapshot, SequenceStep } from "./types.js";

export function nextEnrollmentAction(
  steps: SequenceStep[],
  enrollment: EnrollmentSnapshot,
):
  | { type: "run_step"; stepIndex: number }
  | { type: "wait"; stepIndex: number; reason: string }
  | { type: "complete"; reason: string }
  | { type: "stop"; reason: string } {
  if (enrollment.status !== "active") {
    return { type: "stop", reason: `enrollment_${enrollment.status}` };
  }
  if (enrollment.stepIndex >= steps.length) {
    return { type: "complete", reason: "sequence_finished" };
  }

  const step = steps[enrollment.stepIndex]!;
  if (step.type === "wait") {
    const delay = (step.delayMinutes ?? 0) * 60_000;
    const last = enrollment.lastStepCompletedAt?.getTime() ?? 0;
    if (enrollment.now.getTime() - last < delay) {
      return { type: "wait", stepIndex: enrollment.stepIndex, reason: "delay" };
    }
    return { type: "run_step", stepIndex: enrollment.stepIndex };
  }

  if (step.type === "condition") {
    const ok =
      step.condition === "connected"
        ? enrollment.connected
        : step.condition === "replied"
          ? enrollment.replied
          : enrollment.hasEmail;
    const next = ok ? step.onTrueNext : step.onFalseNext;
    if (next === undefined) {
      return { type: "complete", reason: "condition_terminal" };
    }
    return { type: "run_step", stepIndex: next };
  }

  return { type: "run_step", stepIndex: enrollment.stepIndex };
}
```

```ts
// packages/core/src/email.ts
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function extractEmails(text: string): string[] {
  return Array.from(new Set(text.match(EMAIL_RE) ?? [])).map((e) =>
    e.toLowerCase(),
  );
}

export function guessEmails(
  firstName: string,
  lastName: string,
  domain: string,
): string[] {
  const f = firstName.trim().toLowerCase();
  const l = lastName.trim().toLowerCase();
  const d = domain.trim().toLowerCase().replace(/^@/, "");
  if (!f || !l || !d) return [];
  return [
    `${f}.${l}@${d}`,
    `${f}@${d}`,
    `${f[0]}${l}@${d}`,
    `${f}${l}@${d}`,
  ];
}
```

Export all from `index.ts`. Add tests covering connect→wait→condition→message path and email helpers.

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm --filter @socializer/core test`

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): add caps, sequence FSM, and email helpers"
```

---

### Task 3: Database schema (`@socializer/db`)

**Files:**
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/drizzle.config.ts`, `packages/db/src/schema.ts`, `packages/db/src/client.ts`, `packages/db/src/index.ts`
- Create: migration via drizzle-kit

**Interfaces:**
- Produces: Drizzle tables for workspace, users, proxies, linkedin_seats, leads, lists, list_leads, campaigns, sequences, sequence_steps, enrollments, action_jobs, audit_logs
- Consumes: `DATABASE_URL`

Schema must include seat status enum, action job status enum, encrypted credential fields (`credentialsEncrypted`), proxy FK, enrollment state flags (`connected`, `replied`), and `action_jobs.prompt` / `action_jobs.aiOutput` text columns.

- [ ] **Step 1: Implement schema with Drizzle**

Use `drizzle-orm` + `drizzle-kit` + `postgres` (postgres.js). Include all Slice 1 tables from the design spec §6. Default single workspace row seeded in a SQL seed script `packages/db/src/seed.ts`.

- [ ] **Step 2: Start docker compose and migrate**

Run:
```bash
docker compose up -d
pnpm --filter @socializer/db generate
pnpm --filter @socializer/db migrate
```
Expected: migrations apply cleanly

- [ ] **Step 3: Commit**

```bash
git add packages/db docker-compose.yml
git commit -m "feat(db): add drizzle schema and migrations for slice 1"
```

---

### Task 4: BrowserAdapter + AI package stubs

**Files:**
- Create: `packages/browser/src/types.ts`, `packages/browser/src/adapter.ts`, `packages/browser/src/fake.ts`, `packages/browser/src/linkedin.ts`, `packages/browser/src/enrichment.ts`, `packages/browser/src/index.ts`
- Create: `packages/ai/src/types.ts`, `packages/ai/src/stub.ts`, `packages/ai/src/openai.ts`, `packages/ai/src/index.ts`
- Test: `packages/browser/src/fake.test.ts`, `packages/ai/src/stub.test.ts`

**Interfaces:**
- Produces:
```ts
export type BrowserEngine = "patchright" | "cloakbrowser" | "fake";

export interface BrowserSession {
  seatId: string;
  page: unknown;
  close(): Promise<void>;
}

export interface BrowserAdapter {
  openSeatSession(input: {
    seatId: string;
    proxyUrl: string;
    profileDir: string;
    engine?: BrowserEngine;
  }): Promise<BrowserSession>;
}

export interface LinkedInActions {
  connect(profileUrl: string, note?: string): Promise<{ ok: boolean; detail: string }>;
  message(profileUrl: string, body: string): Promise<{ ok: boolean; detail: string }>;
  isConnected(profileUrl: string): Promise<boolean>;
  withdrawOldestPending(): Promise<{ ok: boolean; detail: string }>;
}

export interface EnrichmentActions {
  findEmails(domain: string, firstName: string, lastName: string): Promise<string[]>;
}

export interface CopyWriter {
  inviteNote(lead: { firstName: string; title?: string | null; company?: string | null }): Promise<{ prompt: string; text: string }>;
  followUpMessage(lead: { firstName: string; title?: string | null; company?: string | null }): Promise<{ prompt: string; text: string }>;
}
```

- [ ] **Step 1: TDD fake adapter + stub AI**
- [ ] **Step 2: Implement Patchright/CloakBrowser launch wrappers behind feature detection; if binaries missing, `fake` engine still works for tests**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add browser adapter and AI copy interfaces"
```

---

### Task 5: Worker — queues, leases, job processors

**Files:**
- Create: `apps/worker/package.json`, `apps/worker/src/index.ts`, `apps/worker/src/queues.ts`, `apps/worker/src/lease.ts`, `apps/worker/src/processors/linkedin.ts`, `apps/worker/src/processors/enrichment.ts`, `apps/worker/src/scheduler.ts`
- Test: `apps/worker/src/lease.test.ts`, `apps/worker/src/processors/linkedin.test.ts`

**Interfaces:**
- Queues: `linkedin-actions`, `enrichment`, `scheduler-ticks`
- `acquireSeatLease(seatId, workerId, ttlMs)` / `releaseSeatLease(seatId, workerId)` using Redis SET NX
- LinkedIn processor: load ActionJob → check caps/kill-switch → acquire lease → run action via fake/real adapter → write audit + update enrollment
- Scheduler tick: for each active enrollment, call `nextEnrollmentAction`, enqueue due ActionJobs respecting caps

- [ ] **Step 1: Write lease tests with ioredis-mock or in-memory fake**
- [ ] **Step 2: Implement worker entrypoint `pnpm --filter @socializer/worker dev`**
- [ ] **Step 3: Integration test: enqueue connect job with fake browser → job succeeded in DB**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(worker): add bullmq processors, seat leases, scheduler"
```

---

### Task 6: Web app — API + minimal control UI

**Files:**
- Create: `apps/web/*` Next.js app (App Router)
- Routes/API:
  - `POST /api/seats` create seat (proxy + encrypted creds)
  - `POST /api/seats/:id/pause` / `resume` / `kill`
  - `POST /api/lists` / `POST /api/lists/:id/leads`
  - `POST /api/sequences` (steps JSON)
  - `POST /api/enrollments` enroll list into sequence
  - `GET /api/action-jobs` recent jobs/audit
  - `POST /api/enrichment/run` enqueue enrichment for list
- Pages: Dashboard (seat status + kill switch), Leads, Sequences, Jobs

**Interfaces:**
- Uses `@socializer/db`, `@socializer/core`, encrypt helper with `ENCRYPTION_KEY`
- Enqueue only — never launch browsers in route handlers

- [ ] **Step 1: Scaffold Next.js + wire env**
- [ ] **Step 2: Implement APIs with zod validation**
- [ ] **Step 3: Minimal UI pages to operate Slice 1 manually**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): add control plane APIs and minimal operator UI"
```

---

### Task 7: Capture-only Chrome extension

**Files:**
- Create: `apps/extension/manifest.json`, `apps/extension/src/popup.ts`, `apps/extension/src/content.ts`, `apps/extension/src/background.ts`, `apps/extension/README.md`

**Behavior:**
- On `linkedin.com` profile pages, extract name/headline/profile URL
- Popup: choose list + “Save lead” → `POST {WEB_ORIGIN}/api/lists/:id/leads`
- No connect/message UI

- [ ] **Step 1: Implement MV3 extension scaffold**
- [ ] **Step 2: Document load-unpacked steps in extension README**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(extension): add capture-only LinkedIn lead saver"
```

---

### Task 8: End-to-end Slice 1 smoke path (fake browser)

**Files:**
- Create: `apps/worker/src/smoke/slice1.fake.test.ts`
- Modify: root `README.md` with run instructions

**Smoke flow (automated with fake adapter):**
1. Seed workspace + proxy + seat (paused=false)
2. Create list + 2 leads
3. Create sequence: connect → wait 0 → condition connected → message
4. Enroll leads; run scheduler tick
5. Worker processes jobs with fake LinkedIn (auto-accept connect)
6. Assert message jobs succeeded and audit logs exist
7. Run enrichment fake domain → lead.email set

- [ ] **Step 1: Write smoke test**
- [ ] **Step 2: Run `pnpm test` — all pass**
- [ ] **Step 3: Update README with architecture + local run**
- [ ] **Step 4: Commit + push**

```bash
git commit -m "test: add slice1 fake-browser smoke path and README"
git push -u origin HEAD
```

---

## Self-review checklist

1. **Spec coverage (Slice 1):** seats/proxies, lists/leads, sequences connect→message, enrichment, extension capture, AI copy interface, caps/leases/audit — each mapped to a task
2. **No placeholders:** tasks specify files, interfaces, commands
3. **Deferred correctly:** content engine / InMail / groups left to later slices

## Execution

After plan commit: use **subagent-driven-development** continuously through Tasks 1–8 without pausing for confirmation.
