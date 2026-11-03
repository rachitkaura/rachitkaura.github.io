# Align

A mutual-interest hiring app with separate candidate and employer workspaces and an isolated fictional demo at `/demo`.

**Built by Rachit Kaura · Independent working pilot · In active development**

[Try the interactive demo — no signup](https://align-career-match-rk.rkaura94.chatgpt.site/demo) · [Portfolio](https://rachitkaura.github.io/#align) · [Development guide](docs/DEVELOPMENT.md) · [Architecture](docs/ARCHITECTURE.md)

This export matches **hosted version 46**, source commit `a4fa28777847c9aa30ebfe0e78a8739e679936dc`, exported **November 2, 2026**. Application code, migrations, tests and app assets are current at that revision. See [SOURCE_SNAPSHOT.json](SOURCE_SNAPSHOT.json) for export adaptations; production data and secrets are excluded.

## Run locally

```bash
cd projects/align
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm dev
```

Use Node.js 24 and pnpm 11.25.0. The full test runner measures built assets, so build first. For a fresh local database or hosting requirements, read [the development guide](docs/DEVELOPMENT.md).

## Core experience

Candidate job discovery is swipe-only. Unilateral interest remains private; only mutual interest opens messages and interview booking. Right swipes use a ten-second Undo window. Live actions are saved in D1 before the UI confirms acceptance, then delivered by the Worker after the deadline, even when the browser closes normally. Delivery revalidates company approval, the role, profile version, privacy, screening answers, and any optional review request. Failed actions remain visible for recovery. Interrupted Worker tasks are recovered on later requests or a configured scheduled trigger.

Candidate navigation is Swipe, Applications, Inbox, and Profile. A single base profile is used for swipes and fit. Optional private document versions remain in a collapsed section; edits never publish themselves. Role-specific résumé and cover-letter drafting is optional and uses grounded templates, with editable DOCX/text exports. Existing documents and private source text are preserved. Coaching and skill-gap planning are deferred from launch. Basic fit and visibility have no premium gate; billing is not connected.

Employer navigation is Swipe, Jobs, Pipeline, and Inbox. Role-scoped candidate review combines the permitted pool, mutual-match and shortlist filters, scoring evidence, and explicitly shared work. Company and team settings remain in the account menu. Employers still need domain proof and separate admin approval before posting jobs.

## One published role rubric

Role setup collects essential skills, teachable gaps, accepted transferable experience, optional relevant-years/start-date targets, salary, arrangement, and location. Practical fields cover first-90-day outcomes, reporting line, hiring contact, interview stages, and expected interview time. Save draft and Publish are separate actions. Full fictional-candidate team calibration is optional and does not block publication or replace published criteria. Open roles expire after 30 days unless reconfirmed.

Both sides use the same deterministic fit engine and role-owned rubric. Evidence-supported essentials and gaps are primary; /100 scores and unknown criteria are secondary. Fixed weights are essential skills 70, relevant years 20, availability 10; unavailable dimensions are excluded. Work values, portraits, private documents, and recruiter-specific preferences do not affect the score. Listed aliases and bounded explicit experience phrases are supported; matching is lexical and claims remain self-reported. No external AI or provider key is required and no score triggers a hiring decision.

Working preferences are optional conversation topics with concrete explanations, grouped by teamwork/communication, independence/responsibility, and impact/growth. Existing stored selections are preserved. Candidates and permitted hiring teams see the same labels and scoring explanation; preferences appear separately from score breakdowns in profile, swipe details, candidate review, and applications. They never change fit, candidate order, or discovery, including when omitted. Legacy work-values weights are normalized to zero.

## Evidence, progress, and handoffs

Candidates can explicitly publish one owned work-summary excerpt on their discoverable profile. The excerpt omits artifact links and all other private cards. Editing or deleting its source revokes the excerpt until republished. Role-specific work sharing remains a separate consent action after a mutual match.

Active mutual applications have a shared next action, owner, and update deadline in Applications and Inbox. Participants can update or complete it; bounded history is retained. Closing or withdrawing an application clears the active step and cancels future interviews. Calendar exports use UTC and a 15-minute reminder; external calendars are not synchronized.

Written-review capacity is an optional employer pilot. Candidates may request a place within the swipe confirmation, unchecked by default. Full windows require explicit waitlist consent. Status and original deadlines are shown on the application. Existing written-outcome obligations, capacity rules, and cancellation/promotion behavior remain intact.

A matched hiring team can export a bounded JSON handoff only if the candidate explicitly enables it in Profile & privacy. Export checks current membership, active mutual status, blocks, privacy, and consent each time. It includes the permitted professional profile, screening answers, and work explicitly shared for that application. Private CV text, education source text, document versions, unshared artifacts, ID images, and team notes are excluded. Revoking permission stops future exports; downloaded copies cannot be recalled.

## Identity, storage, and privacy

Sites supplies trusted authenticated user IDs and email headers. Anonymous visitors cannot modify live records. D1 holds profiles, roles, applications, messages, interviews, permissions, outbox state, and notification preferences; R2 holds private files. Server handlers validate origin, size limits, ownership, and company membership independently of UI navigation.

Profiles are hidden from discovery by default. Contact details follow privacy settings and mutual access. Company/account and exact-domain blocks are enforced server-side; adding a block withdraws applications there and cancels future interviews. Unilateral swipes are excluded from incoming-interest feeds and notifications.

New portrait and photo-ID submissions are paused; profiles show initials. Prior verification records and private cleanup controls remain accessible. Only configured `ALIGN_ADMIN_EMAILS` reviewers can inspect old ID submissions or approve companies. Existing ID deletion, seven-day expiry, durable cleanup retries, metadata stripping, and protected file access remain enforced. Company DNS control and separate business approval are still mandatory; revocation pauses postings.

## Notifications and remaining activation

In-app notifications are available. Account-bound, explicit email opt-in supports mutual matches, messages, interview changes, and review/next-step deadlines. The demo simulates preferences and never sends mail. The live UI does not allow email opt-in until a verified sender is configured.

The Resend delivery path uses durable claims, provider idempotency keys, bounded calls, retries, and a last-minute consent check. Only a generic update and app link leave Align; private messages and candidate data stay in the app. **Production sender credentials and a periodic Worker trigger are not configured.** See [NOTIFICATIONS_SETUP.md](NOTIFICATIONS_SETUP.md) for the remaining activation steps. No email provider or external calendar account is connected by this release.

## Demo isolation

`/demo` uses a local fictional store and a simulated outbox. It supports both sides of the workflow without login or real verification. Network access to live APIs is blocked by the demo adapter. Reset changes fictional browser data only. Public demo profiles and export packets use the same field boundaries as the live app. Private drafts, saved demo actions, and theme preferences survive normal reloads.

## Development and validation

GitHub Pages serves the portfolio; the application runs separately on its Worker backend. This export retains D1 `DB` and R2 `BUCKET` binding names but removes the original Site identity. Eight append-only migrations live under `drizzle/`; local initialization stays separate from production.

`pnpm test` runs seven service-check suites and fourteen test files. Existing recorded browser/performance/accessibility reports are retained under `qa/`; rerun the appropriate checks after changes.

Useful checks:

- `node node_modules/typescript/bin/tsc --noEmit`
- `node tests/focused-hiring.test.cjs` — shared rubric, profile boundaries, summary consent/revocation, durable background swipes, exact Undo, stale-role recovery, next-step authorization, exports, sender readiness, and email idempotency.
- `node tests/demo-store.test.mjs` — isolated, persisted fictional workflows with zero network requests.
- `node --test tests/*.test.mjs` — navigation, gestures, outbox timing/recovery, draft inputs, work sharing, and scroll/focus restoration.
- `node scripts/check-live.cjs` and `node scripts/check-workflows.cjs` — real SQLite migrations, privacy, matching, reviews, optional calibration, membership, booking, role changes, and deadlines.
- `node scripts/check-ranking.cjs`, `node scripts/check-verification.cjs`, `node scripts/check-career.cjs`, `node scripts/check-api.cjs`, and `node scripts/check-application-flows.cjs` — targeted server and document regressions.

Browser QA covers both workspaces, mobile reflow, enlarged text, dialogs, shared next steps, role publication without calibration, explicit work summaries, and simulated notification settings. Physical-device keyboards still need device testing.
