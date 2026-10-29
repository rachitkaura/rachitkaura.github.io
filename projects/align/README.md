# Align

A two-sided hiring platform where candidates and employers connect through mutual interest.

**Built by Rachit Kaura · Working pilot · In active development**

[Open the live pilot](https://align-career-match-rk.whiteboot69.chatgpt.site) · [Portfolio](https://rachitkaura.github.io/#align) · [Architecture](docs/ARCHITECTURE.md) · [Development guide](docs/DEVELOPMENT.md)

## The product

Align brings candidate discovery, company screening, mutual matching and interview coordination into one workflow. Candidates choose when to publish a profile and share contact details. Employers manage roles and team pipelines. Messaging opens after both sides express interest.

The app also provides a separate fictional workspace for exploring the experience. Sample profiles and sample messages stay separate from live hiring records.

## What is implemented

| Area | Capabilities |
| --- | --- |
| Candidate workspace | Profiles, private resume uploads, saved cards, work preferences, opt-in discovery and application tracking |
| Employer workspace | Roles, screening, shortlists, internal notes, domain-verified team invitations and shared pipelines |
| Mutual hiring workflow | Reciprocal interest, participant-authorized messages, availability, interview booking and ICS downloads |
| Trust and privacy | Manual profile/photo-ID review, domain control checks, admin-approved companies, contact-sharing rules and company/domain blocks |
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

## Current boundaries

This is a working pilot, with no adoption or revenue claims. Plus is a free preview; billing is not connected. Skill coverage and career tools use rules and templates, rather than a connected AI model. Uploaded resumes are not parsed automatically. Calendar events are downloadable files; external calendar sync and email delivery are not connected. Identity review is manual.

The full app runs on a Worker backend; GitHub Pages hosts the portfolio only. This source export excludes production data, uploaded files, runtime credentials and the original hosting project identity.

[Development status and remaining work](docs/ROADMAP.md) · [Detailed implementation notes](docs/IMPLEMENTATION.md)
