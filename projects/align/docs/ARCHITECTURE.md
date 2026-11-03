# Align architecture

This source matches hosted Align version 46 at commit `a4fa28777847c9aa30ebfe0e78a8739e679936dc`, exported November 2, 2026. See [SOURCE_SNAPSHOT.json](../SOURCE_SNAPSHOT.json) for the exact export adaptations.

Align has candidate and hiring-team workspaces, with an isolated fictional demo at `/demo`. Candidate discovery stays swipe-only. Mutual interest opens participant-authorized messages and interview booking.

## Source map

| Area | Source | Responsibility |
| --- | --- | --- |
| Workspace and discovery | `app/components/align-app.tsx`, `workspace-nav.tsx`, `swipe-deck.tsx` | Responsive navigation, role/candidate cards, fit and swipe actions |
| Shared role criteria | `app/lib/role-criteria.ts`, `fit-evidence.ts`, `ranking.ts` | One deterministic rubric used on both sides, supported essentials, gaps, known/unknown criteria and score explanations |
| Live hiring | `app/lib/live-server.ts`, `workflows-server.ts` | Publication, company membership, applications, calibration, capped review batches and written outcomes |
| Durable interest | `app/lib/swipe-server.ts`, `interest-outbox.ts`, `remote-outbox.ts` | Server acceptance, exact ten-second Undo, background delivery, retries and recovery |
| Profile materials | `app/components/profile-materials.tsx`, `app/lib/profile-materials.ts`, `document-server.ts` | GitHub, documents, per-role material choices, snapshots, authorized download and revocation |
| Work evidence | `app/components/project-evidence.tsx`, `application-evidence.tsx`, `app/lib/project-evidence.ts` | Structured claims, supporting artifacts, scoped checks, follow-up and pipeline visibility |
| Inbox and handoffs | `app/components/inbox.tsx`, `app/lib/inbox.ts`, `handoff-server.ts` | Conversation access, shared next steps, bookings and consent-bound JSON exports |
| Demo | `app/lib/demo-store.ts`, `demo-seed.ts`, `demo-evidence.ts` | Browser-persisted fictional workflows with live-network calls blocked by the demo adapter |
| Identity and notifications | `app/lib/verification.ts`, `email-notifications.ts`, `worker/index.ts` | Company approval, legacy private-ID cleanup, opt-in preferences and sender-readiness gates |
| Data and checks | `db/`, `drizzle/`, `scripts/check-*.cjs`, `tests/` | Eight ordered SQL migrations, service regressions and fourteen test files |

## State, access and privacy

Trusted Sites identity headers supply the account identity. The Worker checks ownership, accepted company membership, consent, blocks, origin and input limits on the server. D1 holds relational records and private workspace state; R2 holds private files. Candidate discovery publication is opt-in.

One-sided interest is private. Live swipes are accepted durably before confirmation and delivered after the Undo deadline; delivery rechecks the current role, profile, company approval, privacy and optional review request. Matching, review reservations and interview slots preserve their transaction and conflict checks.

Work summaries, per-application work sharing, optional application materials and hiring-data exports are separate consent decisions. Private drafts, unshared evidence, ID images and team notes do not become public through a score or a handoff.

## Scoring and evidence

Both sides use the published role rubric. Required skills carry weight 70, relevant years 20 and availability 10; unavailable dimensions are excluded. Working preferences, portraits, private documents and evidence checks do not affect fit. Claims remain self-reported, lexical matching has limits, and no score automatically makes a hiring decision.

## Runtime boundaries

The full app needs a Worker, D1 `DB`, R2 `BUCKET` and trusted identity integration. GitHub Pages serves the portfolio, not the application backend. A clean local clone uses the portable development profile and its isolated synthetic identity; that identity is not a public authentication service.

Portrait/photo-ID intake is paused. Company domain proof and separate admin approval remain mandatory. Legacy ID access, expiry and cleanup checks remain in the source.

In-app notifications work. Email delivery requires an owner-configured verified sender and provider values; a periodic trigger must also be configured for quiet-period reminders and interrupted-task recovery. Neither production activation is claimed by this export. See [notification setup](../NOTIFICATIONS_SETUP.md).

## Export contents

Application logic, tests, migrations, locally licensed fonts, synthetic fixtures and recorded QA are included. Production data, uploads, runtime secrets, dependencies and build output are excluded. Historical film binaries stay on the hosted Site; `public/watch.html` uses hosted media URLs. This export does not change the hosted app or its data.
