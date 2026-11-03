# Production email and unattended recovery activation

Implemented in this revision: account-bound opt-in UI, durable delivery records, current-consent checks, generic email contents, provider idempotency, retries, and a Worker `scheduled` handler. The live sender and periodic trigger are not configured; no real email has been sent by the release checks.

## Verified sender

Use a verified Resend sender belonging to the app owner. Add these runtime values through Sites environment variables, never source code:

| Key | Purpose |
| --- | --- |
| `ALIGN_EMAIL_API_KEY` | Server-only Resend API key, restricted to sending from the selected domain where supported |
| `ALIGN_EMAIL_FROM` | Verified identity, for example `Align <notifications@your-domain>` |
| `ALIGN_PUBLIC_ORIGIN` | Canonical production HTTPS origin, without a path |

All existing runtime values, including `ALIGN_ADMIN_EMAILS`, must be preserved. Deploy a version after updating runtime values as required by Sites. The settings route reports readiness only when all three fields exist. Provider/domain validation must be completed before describing delivery as operational; presence of values alone is insufficient.

## Scheduled execution

The Worker exports `scheduled`, which recovers expired swipe leases, delivers due accepted actions, generates review/next-step reminders, and attempts queued email sends. Configure a periodic trigger through the hosting provider's supported controls; a one-minute cadence suits delivery/retry recovery. No production cron trigger is installed by the current Sites build manifest. Do not claim a configured schedule until the host confirms it.

Normal accepted swipes already register a Worker `waitUntil` task for their ten-second deadline, independent of browser polling. D1 recovery also runs on subsequent page/API requests. The periodic trigger closes the recovery gap after an interrupted Worker when nobody opens the app, and enables timely reminders during quiet periods.

The current dispatcher deliberately makes at most two provider calls per invocation, each with an eight-second timeout. At higher volume use a supported background queue/worker and increase throughput deliberately; do not simply raise the post-response batch beyond the Worker lifetime.

## Activation check

1. Verify the sender and configure the three runtime values.
2. Confirm the production scheduled trigger and inspect a successful scheduled run.
3. Use an owner-controlled test account, enable only the desired notification categories, and generate a fictional mutual-match or deadline update through an authorized test workflow.
4. Confirm one provider acceptance and one received message. Reprocess the same notification to verify no duplicate. Turn opt-in off and confirm no further sends.
5. Verify a real browser-close swipe delivery, and separately simulate an interrupted task to confirm the periodic recovery path.

Existing SQLite checks mock the provider and cover missing setup, account binding, idempotency, current consent, durable acceptance, precise Undo, and browser-independent recovery. They do not establish that a real sender or production schedule works.
