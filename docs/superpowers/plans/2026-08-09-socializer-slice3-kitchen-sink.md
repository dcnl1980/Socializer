# Socializer Slice 3 — Kitchen Sink Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the platform vision: lead engagement (like/comment/follow/endorse), InMail, groups, multichannel email send, CRM sync hooks, multi-seat rotation, and analytics dashboard.

**Architecture:** Extend LinkedInActions + sequence step types; add email sender + CRM adapters (stub + webhook); rotation picks least-used healthy seat; analytics aggregates from action_jobs/audit_logs/content_posts.

**Tech Stack:** Existing monorepo; fake engines for CI; optional SMTP / CRM webhook via env.

## Global Constraints

- Spec §8 Slice 3+
- Fake path must pass in CI; no live LinkedIn/CRM in tests
- Email send is lightweight (SMTP/API stub), not a full ESP
- CRM sync is outbound webhook/API adapter (HubSpot-shaped stub)
- Stay on `cursor/socializer-linkedin-automation-design-646d`

## File Structure

```
packages/browser — follow, endorse, inmail, group actions (fake + real stubs)
packages/core — rotation picker, analytics helpers, step type union
packages/ai — inmail + group comment copy
packages/db — crm_connections, email_messages, sequence seat_pool, analytics views via queries
packages/email — new package SmtpEmailSender + FakeEmailSender
packages/crm — new package CrmAdapter (webhook stub)
apps/worker — process new step types; rotation on enroll
apps/web — analytics page, CRM settings, email status, sequence multi-seat
```

---

### Task 1: Expand LinkedIn action surface + AI copy

- Add to `LinkedInActions`: `follow`, `endorseSkill`, `sendInMail`, `joinOrPostInGroup`, `likeRecentLeadPost`, `commentRecentLeadPost`, `profileVisit`
- Fake + real stubs; AI helpers for inmail/group/comment
- Tests in fake.test.ts

### Task 2: Email package + sequence `send_email`

- `packages/email` with `EmailSender.send({to, subject, body})`
- Fake stores messages; SMTP via `SMTP_URL` optional
- Worker handles `send_email` / `find_email` steps
- Paid finder API stub behind `EMAIL_FINDER_API_KEY` (off by default)

### Task 3: CRM sync adapter

- `packages/crm` — `syncLead`, `syncReply` → webhook POST `CRM_WEBHOOK_URL` or no-op
- Table `crm_connections` + `crm_sync_logs`
- Hook after successful connect/message/email

### Task 4: Multi-seat rotation

- `sequences.seatPool` jsonb uuid[] (optional); if set, enrollments pick seat via `pickSeat(seats)` least `actionsUsedToday` among healthy
- `enrollments.seatId` override column
- Core unit tests for picker

### Task 5: Analytics + UI

- `GET /api/analytics` — acceptance-ish rates from jobs, content published, emails sent, CRM syncs
- Pages: `/analytics`, CRM settings on seats or `/settings`
- Sequence UI: multi-seat pool field
- Smoke test covering follow → inmail → email → crm sync with fakes

### Task 6: Verify, commit, push, update PR

---

Execute Tasks 1–6 continuously after plan commit.
