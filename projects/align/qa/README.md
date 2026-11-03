# Align demo validation — 31 October 2026

The demo contains 20 fictional roles, 24 profiles, 9 companies and 4 hiring workspaces, with applications, conversations, review windows, work examples and 4 interview records. Stable-ID migration adds the new fixtures once and preserves existing edits, messages, passed cards and queued swipes.

## Two test loops

| Category | Loop 1 | Loop 2 and repair verification |
| --- | --- | --- |
| Performance | Seven real demo-engine operations and production asset/storage budgets passed. | The same benchmark and budgets passed after the changes; see the two performance JSON files. Both font families now load locally (61,768 bytes total). |
| UI/UX | All 20 workspace screens at 390×780 and 1024×780: no horizontal overflow, app errors or swipe-control clipping. | Repeated all 40 screen/viewport combinations. Added 12 cases at 320×640, 700×340, 1280×780 and 200% text; fixed the enlarged-text layout and reran the same cases successfully. |
| Accessibility | axe-core 4.14.0 checked WCAG 2 A/AA, 2.1, 2.2 AA and best-practice rules on the same 40 combinations. Found visible/accessibility-name mismatches and skipped heading levels. | All 40 repeated scans had zero violations. Targeted checks repaired and verified named groups, keyboard scrolling, enlarged-text layout and theme-transition contrast. Open-chat and details-dialog scans and keyboard checks are recorded separately. |

## Fixes from testing

- Accessible control names include their visible labels. Conversation and candidate buttons use their own visible content rather than redundant overrides that omit it.
- Work-example, review, calibration, company and job sections use the correct heading level. Card headings retain their original visual size.
- Swipe actions and ranked candidates have explicit group semantics.
- A clipped card summary is a named, focusable region with a visible focus indicator; keyboard scrolling reaches its final content.
- Short windows and enlarged text use a compact arrangement without reducing type size. Card, fit score, details, decision buttons and Undo remain visible together in the tested 200% text cases.
- Buttons change foreground and background together during theme changes, avoiding a temporary contrast drop.
- DM Sans and Manrope are served from local licensed variable-font files, removing the external font stylesheet dependency.

## Additional verification

- 209 demo integration assertions passed with zero network requests, including upgrade/idempotence, privacy and company/interview/availability scoping.
- 102 focused-hiring assertions passed.
- Inbox, scrolling, workspace navigation, swipe, outbox and feedback regression suites passed, including exact ten-second Undo boundaries.
- TypeScript and the production build passed.
- Mobile search/back navigation preserves search and separate conversation drafts. Enter/Escape and focus restoration work for application and role details. Pass and interest Undo restore the same card. The pending bar stays above mobile navigation.

## Evidence and reproduction

- `browser-round-1-{desktop,mobile}.json`: initial full screen loop.
- `browser-round-2-{desktop,mobile}.json`: repeated full screen loop.
- `viewports-before-fix.json` and `viewports-after-fix.json`: identical extra viewport cases before/after repair, including verification of the ranked-candidate group.
- `interaction-checks.json`: manual browser interactions and targeted dialog/dark-theme scans.
- `performance-round-{1,2}.json`: p95 demo-engine operation times and size budgets. Reproduce with `node tests/demo-performance.test.mjs 2 qa/performance-round-2.json` after a production build.
- `audit-harness.html`: source for the temporary same-origin browser harness. For a local QA run only, copy it into `public/__qa-audit.html` and provide `public/__qa-axe.js` from axe-core 4.14.0. Remove both files before building for publication.

axe cannot automatically determine some text backgrounds because decorative pseudo-elements are present. The reports retain these incomplete findings and record computed foreground/background contrast separately; every reviewed case passed the applicable 4.5:1 or 3:1 threshold. No rules were disabled. The swipe accent is outside the reviewed text.

Performance budgets measure local demo operations in Node and production asset sizes. Browser timings come from the development preview and can be affected by iframe/background scheduling; they are diagnostic data, not production Core Web Vitals. Automated checks and manual keyboard coverage do not constitute a full assistive-technology certification.
