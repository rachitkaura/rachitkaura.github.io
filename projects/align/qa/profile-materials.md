# GitHub and swipe materials — 31 October 2026

Candidates can add a GitHub URL, résumé and cover letter in Profile → Manage profile materials. Documents can be HTTPS links, uploaded PDF/DOCX files, or uploaded copies of a reviewed Align document pack. Upload limits are 5 MB in the live application and 1 MB per file in the browser-only demo. GitHub appears in newly generated résumé and cover-letter source.

Defaults are explicitly selected in the profile. Review sharing on a swipe card supports a different selection for that role. Only selection flags enter the pending swipe; the server revalidates the profile version and copies the selected stored materials at submission. Duplicate delivery preserves that original snapshot. Later profile changes do not replace previous submissions.

Before a mutual match, employers receive no material links or files through discovery, ranking, application responses or document downloads. An active matched hiring team can open selected materials from Inbox → Materials or application details. Unselected documents remain private. Candidate revocation, withdrawal, closing and company blocks prevent future employer access. Profile email/portfolio privacy settings remain separate; selected documents are shared as provided.

## Verification

- `node tests/profile-materials.test.cjs`: 111 assertions passed with real SQLite-backed market and durable-swipe handlers, an in-memory R2 bucket, and the actual offline demo store. Covers URL schemes/hosts, own-account file keys, uploads, exact file bytes, no unilateral disclosure, membership, unselected-file denial, immutable snapshots, idempotence, exact ten-second delivery, stale-profile rejection, blocks, revocation, draft GitHub links, offline persistence, and the HTTP-preview UUID fallback.
- Existing suites passed: 209 demo assertions, 102 focused-hiring assertions, 13 application-source cases, plus inbox, outbox, feedback, scroll, swipe and workspace-navigation regressions.
- Two performance loops passed the existing operation and production asset budgets. See `materials-performance-round-1.json` and `materials-performance-round-2.json`.
- Two UI/accessibility loops passed 12 viewport cases each: 320×640 phone, 700×340 landscape, 1280×780 desktop, 390×640 at 200% text, narrow Inbox, and candidate comparison. Every final case had zero axe violations, app errors, horizontal overflow or clipped swipe controls. See `materials-viewports-round-{1,2}.json`.
- Targeted axe 4.14.0 scans passed for the populated mobile editor, swipe-selection dialog, matched employer chat, employer packet and dark-mode editor. See `materials-browser-audits.json`.
- Browser workflow passed: upload both documents; keep them through reload; select GitHub and résumé while excluding the cover letter; Undo the complete packet; resubmit; confirm no links in employer discovery before matching; match from the employer side; receive exactly the selected pair; revoke as the candidate; remove the materials action. Generating, saving and linking a reviewed Align pack also passed.
- At 390×780, the card ends at y=535, action buttons at y=641, and Undo at y=695, above navigation at y=709.
- A production smoke check caught delayed editor focus interrupting a rapid checkbox click. Initial focus now moves synchronously to the GitHub field; clearing, retyping and immediately checking the control passed in one browser interaction. TypeScript, scrolling and inbox regressions passed again.
- TypeScript and production builds passed. Temporary audit assets are removed before publication.

The managed HTTP preview could prepare the native Blob download links but its browser download-capture API timed out. Exact download bytes and authorization are verified by the integration suite; production file URLs use the authenticated streaming endpoint. Browser timings are development diagnostics, not production Core Web Vitals. Automated scans are not a full assistive-technology certification.
