# Pipeline work evidence

Pipeline cards and application details previously omitted the work-example feature. Active mutual applications now carry a small server-derived summary: shared-example count, recorded-check count and one example title. Pipeline cards show this summary and a View work examples action. Selected GitHub/résumé/cover-letter links also appear on active matched cards when present.

The dedicated review dialog loads only the selected application's explicitly shared examples, using the same renderer, evidence-check forms and discussion forms as candidate comparison. Candidates can revoke a share or choose more examples; employers can record checks and save follow-ups without leaving the pipeline. Successful writes refresh both the scoped view and pipeline counts. Dialog transitions restore focus to the new dialog, and missing/closed/withdrawn applications do not retain an old evidence view.

The live workspace query aggregates only already-readable active mutual matches. Full card contents and artifact URLs are fetched on demand through an application-scoped workflow request, which validates access and returns no private library, unrelated examples, review batches or calibration data. The demo uses the same access conditions and separate per-application summaries. A supporting application-ID index avoids scanning the full share table for the new lookup.

## Verification

- The project-evidence integration suite now passes 185 checks, including new candidate/employer pipeline summaries, check-count updates, scoped reads without private cards, cross-application/company rejection, revoked/withdrawn access and demo parity.
- Existing demo (209 assertions), focused hiring (102), material sharing (111), work-proof (22 cases), application-source (13 cases) and TypeScript checks passed.
- Browser flow verified: open examples directly from an employer pipeline item; save a discussion review; add an evidence check and see the card's check count increase; revoke a second example from candidate Applications and see the count decrease immediately.
- Focused UI/accessibility reports: `pipeline-ui-round-{1,2}.json`. Cases cover 320px cards, 390px review dialogs, desktop, dark mode, 200% text and the application-details-to-evidence transition.
- Performance reports: `pipeline-performance-round-{1,2}.json`. Measurements cover the actual offline demo engine and production asset budgets, not production Core Web Vitals.
- Reproduction harness: `pipeline-audit-harness.html`, temporarily served with axe-core; temporary public QA files are removed before building.
