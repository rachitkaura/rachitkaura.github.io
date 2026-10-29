# Align

A careers app with a public live hiring area and a separate fictional sample workspace. Existing sample profiles, matches, documents, dark-mode preferences, and sidebar scrolling are preserved.

## Live hiring

Visitors can browse active roles. Signed-in candidates can publish an opt-in live profile, set salary/work arrangement/location/travel/start-date preferences, answer screening questions, and send interest. Company owners can publish roles and reconfirm openings every 30 days; expired and closed jobs leave public discovery automatically at query time.

Candidate and employer interest are stored independently. Mutual interest unlocks participant-authorized messages and bookable availability. Both sides see application stages and in-app notifications. Interviews are booked atomically against a shared slot, with overlap protection for the two participants. Calendar downloads contain UTC times and a 15-minute alarm; no external calendar or email service is connected. Closing or withdrawing an application cancels future interviews in Align. Downloaded calendar events must be updated by their users.

Company owners verify domain control with a TXT record at `_align-verify.<company-domain>`. A server-side DNS-over-HTTPS lookup checks the exact challenge before issuing the domain verification badge. The badge verifies control of a domain, not the legitimacy of every claim or job. Verified companies can invite up to 30 same-domain teammates. The owner saves an email-bound invitation; the teammate signs in with that email and accepts it. No email is sent automatically. Accepted members share the company pipeline, screening answers, shortlist, internal notes, messages and interview details.

## Identity, storage and privacy

Sites supplies authenticated user IDs and email headers. Anonymous visitors cannot modify live records. D1 stores normalized companies, memberships, profiles, roles, applications, messages, slots, interviews, notifications and preferences. Existing private workspace JSON and owner-only résumé files remain in D1 and R2. All write routes validate Origin and payload sizes; every live operation checks ownership or company membership on the server.

Live profile publication is explicit. Profiles are hidden from discovery by default. Contact details can remain private, be shared after candidate interest, or be shared after a mutual match. Company/account and exact-domain blocks are enforced when employers retrieve candidate records and when they act on applications. Adding a block withdraws existing applications there and cancels future interviews. Uploaded résumés and generated application documents are not exposed by the live APIs. Hiring notes are excluded from candidate responses.

## Align Plus preview

Plus is free to explore; billing and paid entitlements are not connected. It includes multiple private career profiles, equal-weight listed-skill coverage with explicit aliases, editable profile-grounded résumé and cover-letter drafts, DOCX/text exports, role-specific interview practice, structure feedback, and a saved skill-gap checklist. A score is not hiring probability. The interview coach checks answer patterns and length; it does not assess truth, audio delivery or employability. Coaching and document drafting use local rules/templates, not a connected AI model. Uploaded files are not parsed automatically.

## Sample workspace

Discover, sample Matches, sample Interviews, profiles and document packs remain available for exploration. Seeded companies and candidates are fictional. Sample messages and interview plans stay in the user's private workspace; live hiring records use the dedicated live APIs. Existing sample roles are never promoted to real public postings automatically.

## Development and verification

Use the Sites tooling for source synchronization, preview, builds and publication. The existing manifest preserves public access, D1 `DB`, and R2 `BUCKET`. Append-only schema migrations are under `drizzle/`; Sites applies pending migrations at deployment. Local preview migrations are separate from production.

Checks:

- `node node_modules/typescript/bin/tsc --noEmit`
- `node scripts/check-api.cjs` — existing workspace/file authentication and isolation.
- `node scripts/check-career.cjs` — skill coverage, grounded drafting and document exports.
- `node scripts/check-live.cjs` — actual SQLite migrations, reciprocal interest, screening validation, participant authorization, contact redaction, privacy withdrawal, atomic booking conflicts, team membership, DNS verification, role expiry, preferences, coaching, ICS alarms and bounded queries at 200 applications.

Browser QA covers live navigation, anonymous browsing, preferences, dark mode, the Plus preview, answer review and action-plan progress. Authenticated multi-account flows are exercised with isolated test identities against the same server handlers and real SQLite; production user sign-in is supplied by Sites.

## Profile and company verification

The site owner's authenticated email is configured in the server-only secret `ALIGN_ADMIN_EMAILS` as the initial reviewer. Company owners and ordinary members are not verification admins. Profile ID images and staged portraits are stored under private R2 keys, accessible only through authenticated, authorized routes. Profile photos are published to permitted employers only after a manual name/portrait/ID check. Changing the display name or replacing/removing the photo invalidates verification. ID images are deleted after review or withdrawal. Pending requests expire after seven days; expired images are inaccessible and are cleaned up on verification-service access. Failed deletions remain in a durable cleanup queue for retry. No document numbers or ID image contents are placed in audit records, workspaces, candidate API responses, or notifications. JPEG metadata is stripped server-side. No automated face recognition is performed.

Live job creation, editing, reopening, discovery and new interest require both DNS domain proof and a separate admin-approved company review. Revocation pauses open jobs. Existing unapproved companies must submit for review; no company is automatically grandfathered into approval.

`node scripts/check-verification.cjs` validates private image access, admin role boundaries, badge tampering, document cleanup, metadata removal, expiry and withdrawal, approval/rejection/revocation, and all company posting gates using synthetic image fixtures and isolated identities.

The mobile workspace switcher is rendered in the top header. Its sidebar version is hidden on small screens to avoid the fixed-position containing block created by the bottom rail's backdrop blur. Bottom navigation and main-content padding respect the device safe area.
