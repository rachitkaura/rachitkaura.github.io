# Align product to-do

Updated: 31 October 2026

## Focused launch changes

- [x] Replace mandatory fictional calibration with a short role checklist; keep team calibration optional.
- [x] Use one base Profile for discovery and swipes. Keep existing private document versions collapsed and separate.
- [x] Defer Coach/skill-gap planning, remove stand-alone document navigation, and keep optional drafting within roles/applications.
- [x] Remove work-value scoring and basic fit/visibility premium gates. Preserve descriptive preferences and existing saved data.
- [x] Pause portrait/photo-ID intake and show initials; retain old-record cleanup and mandatory company approval.
- [x] Consolidate employer pool, comparison, shortlist filters, and evidence into role-specific Review candidates.
- [x] Make review capacity an optional pilot; keep original obligations and application-linked statuses.
- [x] Publish role-owned criteria used by the same candidate and employer fit engine, with evidence before scores.
- [x] Add an explicitly consented public work-summary excerpt, with artifacts omitted and revocation on source edit/delete.
- [x] Add shared next action, owner, deadline, completion, and bounded history for active mutual applications.
- [x] Implement durable server-backed live swipes with exact ten-second Undo, Worker background delivery, and recoverable failures.
- [x] Add explicit export consent and server-authorized JSON hiring handoffs containing only permitted/shared information.
- [x] Add 90-day outcomes, reporting line, hiring contact, interview stages, and expected interview time to roles.
- [x] Implement opt-in email preferences and a durable provider delivery path; make missing setup explicit.
- [ ] Activate a verified production sender and confirm real email delivery. Owner-supplied sender/domain/API credentials are still needed; see `NOTIFICATIONS_SETUP.md`.
- [ ] Configure and verify a supported periodic hosting trigger for quiet-period reminders and interrupted-task recovery. The Worker handler is ready; no trigger is installed.

## Implemented workflows

- [x] **FLOW-01 — Integrate review places into the candidate swipe flow.**

  Candidate interest and an optional written-review request now use one transaction after the 10-second undo window. Job discovery remains swipe-only.

  Implemented behavior:

  - Show the employer's review deadline and current place availability on the relevant swipe card.
  - When a candidate swipes right on a role with a review window, use one confirmation that explains the profile being shared, the review request, and the deadline. Complete required screening answers before submission.
  - Send interest and join the review queue through that submission. Do not make candidates apply twice or visit a separate reservation journey.
  - Confirm an allocated place with “Review place confirmed. Response due [date].” State that this is a written review outcome, rather than an interview booking.
  - If places are full, offer an explicitly labelled waitlist before committing. Explain that a waitlist place has not secured a review.
  - If there is no active review window, keep normal interest submission available without suggesting a review deadline.
  - A mutual match opens the existing conversation immediately and skips a new review reservation.
  - Put review status, deadline, cancellation, and written outcomes alongside the relevant application. The separate candidate review destination now aliases to Applications.
  - Employers continue to manage their capacity, deadlines, and review obligations in the employer workspace.

  Validation and consistency:

  - Recheck capacity, role availability, privacy, and eligibility at submission time. Handle concurrent requests and retries without duplicate applications or reservations.
  - Never report both actions as complete if only one saved. Prefer one atomic operation; otherwise show the precise saved state and a safe recovery action.
  - Preserve first-come waitlist promotion and cancellation rules.
  - Decide how an existing reservation is resolved when a later mutual match occurs, so a place or promised outcome is not silently lost.
  - Verify available, full, closed, no-window, screening-required, already-applied, already-reserved, mutual-match, retry, and mobile cases in both the live handlers and isolated demo.

  Relevant source: `app/components/swipe-deck.tsx`, `app/components/live-hiring.tsx`, `app/components/hiring-workflows.tsx`, `app/lib/workflows-server.ts`, `app/lib/review-queue.ts`, `app/lib/demo-store.ts`, and `app/lib/demo-guide.ts`.

## Additional implemented workflows

All recommendations below are implemented in the live handlers and isolated demo where applicable.

- [x] **FLOW-02 — Profile used for a swipe.** make the employer-visible profile clear before interest is sent. The canonical base profile drives swipes; private document versions are collapsed within Profile.
- [x] **FLOW-03 — Drafts versus submitted interest.** make generating, saving, and downloading a résumé clearly distinct from sending interest. Show what the employer actually receives; document packs currently remain private.
- [x] **FLOW-04 — Work-example sharing.** offer the next step from the relevant application, preselect its company and role, and retain explicit sharing consent. Clearly distinguish a private saved card from a shared card.
- [x] **FLOW-05 — Interview booking.** keep the journey anchored in the matched conversation. Distinguish offered availability from a confirmed interview, show the time zone, and make booking/cancellation updates and calendar-download behavior clear.
- [x] **FLOW-06 — Employer setup and publishing.** provide a single readiness checklist covering company approval, role draft, hiring criteria, publication, and optional review capacity. Clearly distinguish saving a draft from making a role visible to candidates.

- [x] **FLOW-07 — Review outcome to conversation.** An advance outcome should record employer interest and open the existing conversation once both sides have expressed interest. Review-only records must not bypass mutual matching.
- [x] **FLOW-08 — Fit score and mutual-match terminology.** Use fit or listed-skill coverage for a comparison score, and mutual match for reciprocal interest. Avoid labels that make a numerical fit look like a connection.
- [x] **FLOW-09 — Changing decisions.** Distinguish undoing a pass, withdrawing submitted interest, ending a conversation, and cancelling an interview. Show effects on review places, interviews, and notifications before the action.
- [x] **FLOW-10 — Missed review deadlines.** Preserve the original deadline, show overdue status and who needs to act, and provide clear next actions for the candidate and employer.
- [x] **FLOW-11 — Changed or closed roles.** Explain whether a change stops new swipes or ends the active application. Highlight material salary or requirement changes and resolve affected review obligations explicitly.
- [x] **FLOW-12 — Empty swipe decks.** Explain whether preferences, previous decisions, or a lack of new roles caused the empty state. Offer preference adjustments or revisiting passed cards while keeping job discovery swipe-only.

## Completed

- [x] **FLOW-18 — A focused Inbox.** Replace horizontal mobile conversation cards and repeated introductions with a searchable vertical list, message previews and recent activity. Open a dedicated mobile thread with a Back button, multiline composer, compact next-step/interview actions, and application details on demand. Preserve per-conversation drafts, scroll position, shared next-step editing, mutual-match access, and candidate/hiring-team permissions. Keep message history readable in short and keyboard-sized viewports.

- [x] **FLOW-17 — Compact mobile swipe feedback.** Reserve a slim undo row below the swipe buttons; keep the current card visible and the buttons steady. Show the latest active swipe and its countdown, with the full queue and individual Undo/retry/dismiss actions in a sheet opened only by a tap. Keep the queue accessible across workspaces, surface failures without opening the sheet automatically, remove routine sent popups, and preserve each original ten-second deadline.

- [x] **FLOW-16 — Clear, consistently unscored working preferences.** Replace the bare value checklist with optional, grouped choices and practical descriptions. Preserve stored selections and show the same conversation topics to candidates and permitted hiring teams, outside the fit score. Remove legacy work-values weights, share the score explanation across both sides, and reserve a sticky dialog header so the close button does not cover scrolled content on mobile.

- [x] **FLOW-13 — Anonymous swipes and a 10-second undo window.** One-sided interest labels, notifications, and inbound application records are hidden. Incoming-interest feed priority is removed. Each right swipe is held for 10 seconds with an individual undo action, including when navigating between workspaces. Live submissions are accepted durably by the server and delivered after that window by a Worker task, with an error and retry action if delivery fails. Match notifications and conversations remain available after mutual interest. Verified with timing, account-change, live privacy, isolated-demo, desktop, and narrow-mobile checks.

- [x] **FLOW-14 — Mobile New profile button.** Place the full labelled button below the heading on small screens. Verify it opens the editor and successfully saves a private career profile at 320px, without changing the employer-visible profile.

- [x] **FLOW-21 — Expand the fictional demo dataset.** Seed 20 roles, 24 candidate profiles, 9 companies, 4 hiring workspaces, 6 private work examples, richer conversations and varied application stages. Include future/past interview examples, shared next steps, and additional review windows. Add examples once to existing sessions without replacing edits, messages, passed cards or pending swipes. Scope sample interviews and availability to their conversations and companies. Verify fixture references, anonymous interest, review-to-match behavior, reload/reset and migration without network requests.

- [x] **FLOW-20 — Put demo content and the swipe interaction on screen immediately.** Move the fictional-data label, guided journeys and reset into the header's Demo menu; tighten section headings and remove repeated single-tab navigation, completed sample setup and empty private-draft summaries. Give the swipe screen a viewport layout with an anchored fit summary, detail button, decision buttons and a shared Undo row. Open full role/candidate details and guided steps in keyboard-accessible dialogs. Keep desktop navigation, private profile context, anonymous interest and each original ten-second Undo deadline. Checked phone, unfolded, desktop, short landscape, details/guide dismissal, pass Undo, interest Undo and section navigation.

- [x] **FLOW-19 — Restore the full workspace on unfolded and wider screens.** Phone chrome ends at 600px; 601–1023px uses a labeled side rail, and larger screens retain the full sidebar. Swipe actions stay below the complete card at wider widths. Inbox keeps its list and conversation together, releases the phone scroll lock when unfolded, and preserves the active draft. Checked the 600/601 boundary, 640–1280px layouts, candidate and hiring navigation, and 200% text.

- [x] **FLOW-15 — Responsive layouts and scrolling.** Use one page scroll for each workspace, with independently scrolling desktop navigation, dialogs, and message history. Preserve page position and focus when closing dialogs, returning to candidate results, and navigating back. Follow new chat messages only when appropriate and preserve reading position. Reflow headings, forms, badges, and navigation at narrow widths and enlarged text sizes. Keep close buttons, swipe actions, and Undo reachable in short viewports; account for safe areas and the visible viewport when keyboard space changes.

## Product constraints to preserve

- Candidate job discovery stays swipe-only, with details and preparation tools on individual cards.
- One-sided swipes stay private. Only mutual interest unlocks conversations.
- The integrated review flow preserves private interest and explicitly explains review submissions and evidence sharing.
- Private drafts, evidence-sharing consent, company approval, and identity/privacy rules remain explicit.
- Fictional demo activity stays isolated from live accounts and real recipients.

## Verification

- SQLite integration checks cover atomic interest/review submissions, capacity changes and waitlist consent, duplicate retries, screening answers, stale profile/role versions, anonymous review records, mutual-match place release, FIFO promotion, review-only legacy consent, material role changes, original deadlines, closed-role obligations, and independent cancellation.
- The demo integration suite exercises isolated workflows and persistence with no external network calls. Timing tests cover exact undo boundaries, independent queues, account changes, cross-tab cancellation, persistence, storage failures, and updated consent on re-confirmation.
- Browser checks cover the combined swipe/review journey, application-linked status and work sharing, matched-conversation booking, employer readiness and review-to-conversation flow, and mobile profile creation at 320px and 390px.
- Responsive browser checks cover all 11 candidate and 13 employer screens at 320px without horizontal overflow; representative layouts at 390px, 430px, 768px, 1024px, and 1280px; landscape; 200% text on profile, preferences, evidence, review status, and comparison screens; and 340px keyboard-sized viewports. Dialogs retain background position, chat history supports keyboard scrolling without moving the page, and candidate review restores the selected result. Keyboard-sized checks simulate reduced viewport space; physical-device keyboard behavior still needs device testing.
- `tests/scroll.test.mjs` covers nested modal locks, position restoration, scrollbar compensation, idempotent cleanup, navigation during a lock, focus without page jumps, and bounded message-history keyboard movement.

FLOW 22 — Completed two loops each of demo performance, UI/UX and accessibility checks. Repaired accessible names/headings/groups, keyboard card scrolling, enlarged-text swipe layout and theme-transition contrast. Local fonts and QA evidence are included; see qa/README.md.

FLOW 23 — GitHub and résumé/cover-letter links, uploads and saved Align packs can be linked to the base profile. Explicit per-role swipe selection, immutable submission snapshots, mutual-match downloads, candidate revocation and offline demo persistence are implemented. Two focused UI/accessibility/performance loops passed; see qa/profile-materials.md.
