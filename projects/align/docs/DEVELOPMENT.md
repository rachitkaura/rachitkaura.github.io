# Developing Align

This is the November 2, 2026 source export of hosted Align version 46. Use Node.js 24 and pnpm 11.25.0, pinned in `package.json`. The minimum declared Node version is 22.13.0; integration checks use Node's SQLite module.

## Install, build and check

From the repository root:

```bash
cd projects/align
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
```

Build before running the full test runner: the demo-performance test measures `dist/client` production assets. `pnpm test` runs seven service-check suites and fourteen test files in order, stopping on the first failure. It uses synthetic identities, in-memory SQLite and local fixtures.

For focused work:

```bash
node tests/focused-hiring.test.cjs
node tests/profile-materials.test.cjs
node tests/project-evidence.test.cjs
node scripts/check-application-flows.cjs
node scripts/check-ranking.cjs
node scripts/check-workflows.cjs
node tests/demo-performance.test.mjs
```

The existing QA reports under `qa/` describe their recorded runs. They are not a substitute for rerunning the relevant checks after changes.

## Local preview

```bash
pnpm dev
```

Use the URL printed by the server, normally `http://localhost:5173`. Open `/demo` for the fictional experience without production resources. The demo adapter blocks live API requests and persists fictional state in the browser.

For a fresh local database and the built Worker:

```bash
pnpm build
pnpm db:local
pnpm start
```

The initializer applies all eight ordered SQL files to local `.wrangler/state`. Run it once for a fresh database. It uses `--local`; it never targets production. Existing local databases need an appropriate migration plan rather than rerunning the fresh initializer.

The portable development profile supplies a loopback-only synthetic sign-in. Production identity is supplied by Sites; deployments elsewhere require a trusted identity gateway that strips untrusted identity headers and supplies verified identities.

## Hosting and configuration

GitHub Pages hosts the portfolio only. The full application needs a Worker runtime, D1 binding `DB`, R2 binding `BUCKET`, trusted identity and server-only reviewer configuration. The exported `.openai/hosting.json` retains binding names and omits the original Site identifier.

[Open the current interactive demo](https://align-career-match-rk.rkaura94.chatgpt.site/demo). Publishing this source to GitHub does not redeploy that app, copy its records or activate email. For production notification setup and periodic recovery, read [NOTIFICATIONS_SETUP.md](../NOTIFICATIONS_SETUP.md).

Do not commit credentials, production records, uploaded files, dependencies, build output or local runtime state. Use synthetic fixtures when extending tests. The export's film-watch page links to hosted media rather than bundling historical film renders.
