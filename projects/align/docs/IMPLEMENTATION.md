# Align implementation

The current product and implementation notes are maintained in the [project README](../README.md). This public export contains the code for the same hosted version recorded in [SOURCE_SNAPSHOT.json](../SOURCE_SNAPSHOT.json).

## Connected journeys

- Candidate discovery is swipe-only, with profile fit on cards and details showing supported essentials, gaps and unknown information.
- One base profile drives discovery and fit. Optional private document versions remain separate. Role-specific résumé and cover-letter drafts are editable and use grounded rules/templates.
- GitHub links and résumé/cover-letter materials have explicit profile and per-role controls. Submitted selections are snapshotted; employer access requires active mutual interest, current authorization and consent.
- Work-proof cards capture context, ownership, decisions, outcome, measurement and limits. Supporting links, simulation labels, scoped employer checks and follow-up discussions remain attached to the relevant application.
- Role criteria, optional team calibration, candidate comparison, review capacity, written outcomes, pipeline stages and shared next steps connect hiring-team decisions to candidate-visible progress.
- Mutual interest opens messages and booking. Downloadable calendar files include reminders; external calendar synchronization is not connected.
- Durable live swipes support the ten-second Undo window and Worker delivery. Interrupted tasks remain recoverable.
- Explicit export consent controls bounded JSON hiring handoffs. Downloads already made cannot be recalled.

## Boundaries to preserve

Working preferences and evidence checks do not change fit. Evidence claims remain self-reported; checks have a limited scope and do not create a general verified-experience badge. One-sided interest remains private.

The fictional demo is isolated from live records and does not send email. New portrait/photo-ID submissions are paused; prior private-record cleanup is retained. Company domain control and separate admin approval remain mandatory.

Provider credentials and a periodic production trigger are not included or activated. See [notification setup](../NOTIFICATIONS_SETUP.md). The app uses trusted Sites identity; another host needs an appropriate trusted identity integration.

## Validation

Seven service-check suites and fourteen test files are included, covering the actual source and SQLite migrations. Recorded browser, performance and accessibility evidence remains under `qa/`. Read [the development guide](DEVELOPMENT.md) for commands and [the architecture](ARCHITECTURE.md) for the source map.
