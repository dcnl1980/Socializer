# Socializer Slice 4 — Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Socializer for real internal use: SMTP + email finder APIs, HubSpot CRM, simple app auth, LinkedIn login/session warm + reply detection, AI quality filters, and ops health endpoints.

**Architecture:** Keep fake defaults for CI; enable real providers via env (`SMTP_URL`, `EMAIL_FINDER_API_KEY`, `HUBSPOT_ACCESS_TOKEN`, `AUTH_PASSWORD`). Add inbox/reply polling jobs and `/api/health`.

**Tech Stack:** Existing monorepo + `nodemailer` for SMTP; fetch-based Hunter-compatible finder; HubSpot CRM v3 contacts API.

## Global Constraints

- Slice 4 was not in original spec — defined as production hardening of leftover gaps
- CI remains fake/no network for LinkedIn/CRM/email unless env keys present
- Stay on `cursor/socializer-linkedin-automation-design-646d`
- Update design spec §8 with Slice 4 definition

## Tasks

1. Spec + plan docs
2. Email: SmtpEmailSender (nodemailer) + HunterEmailFinder
3. CRM: HubSpotCrmAdapter + factory selection (webhook | hubspot | noop)
4. Auth: simple cookie session gate on web APIs/UI
5. LinkedIn: `loginAndWarm`, `detectReplies` on actions; worker inbox poll job; enrollment `replied` updates
6. AI quality filter (length, banned phrases, spammy patterns)
7. `/api/health`, Inbox UI page, settings for providers
8. Tests (unit + slice4 smoke) + build + push + PR update

Execute continuously after plan commit.
