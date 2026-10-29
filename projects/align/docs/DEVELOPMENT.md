# Developing Align

Use Node.js 24 and pnpm 11.25.0, which is pinned in `package.json`. The declared minimum Node version is 22.13.0; the checks use Node's built-in SQLite module. The publication snapshot was verified on Node 24.22.1.

## Install and check

From the repository root:

```bash
cd projects/align
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

If pnpm is unavailable, install the pinned version with `npm install --global pnpm@11.25.0`, or use Corepack to run that version. Dependency versions and the pnpm build-script policy are retained from the live app. The Linux Sites helper `npm run install:ci` is also retained for its original managed environment.

## Local preview

For a fresh local database, build first, then initialize the local schema and start the built Worker:

```bash
pnpm build
pnpm db:local
pnpm start
```

The local migration script runs the four SQL files in order with `--local` and `.wrangler/state`. Run it once for a new local database; rerunning it against an initialized schema can report existing tables. It never targets a remote database. Use the URL printed by Wrangler.

For hot reload, run `pnpm dev` and use the local URL it prints, normally `http://localhost:5173`. The portable development server offers a loopback-only synthetic sign-in; it is not real ChatGPT authentication. Production authentication is supplied by Sites. The isolated test suites exercise multiple identities without needing a production account or production data.

## Test coverage

| Command | Existing scenarios exercised |
| --- | --- |
| `node scripts/check-api.cjs` | Workspace ownership, origin checks, upload validation and resume-file isolation |
| `node scripts/check-career.cjs` | Listed-skill coverage, aliases, false-positive avoidance, grounded drafting and Word XML escaping |
| `node scripts/check-live.cjs` | SQL migrations, reciprocal interest, screening, team membership, contact privacy, blocks, booking conflicts, DNS proof, expiry and bounded queries |
| `node scripts/check-verification.cjs` | Admin boundaries, private image access, metadata stripping, review decisions, stale approvals, expiry, deletion retries and company posting gates |

`pnpm test` runs all four suites. These tests use in-memory SQLite, synthetic identities and a tiny synthetic image fixture. They are not evidence of real customer adoption, production load testing or an independent security audit.

## Hosting

GitHub Pages serves the portfolio page only. Align's full application needs a Worker runtime, D1 binding `DB`, R2 binding `BUCKET`, trusted authentication and server-only `ALIGN_ADMIN_EMAILS` configuration for reviewers.

The committed `.openai/hosting.json` contains the storage binding names but omits the original Site's project identifier. The live pilot remains at [the Align website](https://align-career-match-rk.whiteboot69.chatgpt.site). Publishing this source to GitHub does not redeploy that pilot or copy its data.

For a new Sites deployment, register the clone as its own Site and configure its own identity and bindings with the Sites workflow. For another Cloudflare deployment, supply your own resources and trusted identity gateway; the current source is not a standalone GitHub Pages app.

## Files to keep local

The project ignores environment files, keys, dependencies, build output and `.wrangler`/`.sites-runtime` state. Use synthetic data when extending tests. Keep live uploads and database exports outside source control.
