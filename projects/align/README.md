# Align

A two-sided hiring platform where candidates and hiring teams connect through mutual interest.

**Built by Rachit Kaura · Working pilot · In active development**

[Try the current interactive demo — no signup](https://align-career-match-rk.rkaura94.chatgpt.site/demo) · [Portfolio](https://rachitkaura.github.io/#align) · [Architecture](docs/ARCHITECTURE.md) · [Development guide](docs/DEVELOPMENT.md)

## Explore the current demo

**Your next move, mutual.** Switch between Candidate and Hiring team to follow the same journey from both sides. All demo profiles and companies are fictional.

- **Find roles and see fit:** swipe discovery, fit on the card and an explanation of matches and gaps.
- **Prepare and choose what to share:** editable résumé and cover-letter drafts, GitHub links and profile documents, with a sharing review for each swipe. Selected materials become available after mutual interest.
- **Show your contribution:** structured work examples covering the problem, personal contribution and outcome, supporting links and employer-specific evidence checks.
- **Set review expectations:** shared calibration, candidate comparison, capped review batches and review places with written outcome deadlines.
- **Connect and book:** mutual interest opens messages and interview booking, with calendar downloads.

Profile fit uses required skills, relevant experience and start-date alignment; missing details are left out. Working preferences and evidence checks do not affect the score. Work claims remain self-reported, and each recorded evidence check has a limited scope.

## What this public source contains

**This is the October 29, 2026 source snapshot.** The hosted demo includes later updates. Newer profile-fit scoring, review batches, work-proof cards and swipe-material controls are not represented by this export. This documentation distinguishes the current demo from the code available here.

| Snapshot area | Capabilities |
| --- | --- |
| Candidate workspace | Profiles, private resume uploads, saved cards, work preferences, opt-in discovery and application tracking |
| Employer workspace | Roles, screening, shortlists, internal notes, domain-verified team invitations and shared pipelines |
| Mutual hiring workflow | Reciprocal interest, participant-authorized messages, availability, interview booking and ICS downloads |
| Trust and privacy | Domain control checks, admin-approved companies, contact-sharing rules and company/domain blocks; manual profile/photo-ID review code is included, while submissions are paused in the current demo |
| Career tools | Listed-skill coverage, editable resume and cover-letter drafts, DOCX export, guided interview practice and skill-gap checklists |
| Reliability checks | TypeScript, four automated check suites, actual SQLite migrations and synthetic identity-review fixtures |

## Technical stack

TypeScript, React, Vinext with Next.js-style routing, Vite, Tailwind CSS, Cloudflare Workers, D1/SQLite, Drizzle and private R2 file storage. Hosted sign-in is supplied by ChatGPT Sites. UI primitives, framework integration helpers and their retained license files are included.

## Explore the source

- `app/` — interfaces, API routes, live hiring, verification, career tools and document generation.
- `db/` and `drizzle/` — schema, four ordered SQL migrations and migration metadata.
- `worker/`, `vite.config.ts` and `scripts/` — runtime entry point, build integration and checks.
- `components/`, `hooks/`, `lib/`, `vendor/` and `public/` — shared UI, utilities and assets.
- `docs/` — architecture, setup, implementation notes and current development status.

## Run the checks

Use Node.js 24 and pnpm 11.25.0. From the repository root:

```bash
cd projects/align
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

For a fresh local database and the built Worker:

```bash
pnpm db:local
pnpm start
```

The migration command is for first-time local initialization. See [the development guide](docs/DEVELOPMENT.md) for hot reload, sign-in behavior, hosting requirements and individual check commands.

## Source snapshot boundaries

This is a working pilot, with no adoption or revenue claims. Plus is a free preview; billing is not connected. Skill coverage and career tools use rules and templates, rather than a connected AI model. Uploaded resumes are not parsed automatically. Calendar events are downloadable files; external calendar sync and email delivery are not connected. Identity review is manual.

The full app runs on a Worker backend; GitHub Pages hosts the portfolio only. This source export excludes production data, uploaded files, runtime credentials and the original hosting project identity.

[Development status and remaining work](docs/ROADMAP.md) · [Detailed implementation notes](docs/IMPLEMENTATION.md)
