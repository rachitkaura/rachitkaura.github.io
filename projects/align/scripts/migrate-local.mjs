import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import './sites-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = 'dist/server/wrangler.json';
if (!existsSync(new URL(`../${config}`, import.meta.url))) {
  throw new Error('Build before initializing a fresh local database: pnpm build');
}
const files = readdirSync(new URL('../drizzle/', import.meta.url)).filter(file => file.endsWith('.sql')).sort();
const sql = files.map(file => readFileSync(new URL(`../drizzle/${file}`, import.meta.url), 'utf8')).join('\n\n');
const input = '.sites-runtime/align-local-init.sql';
mkdirSync(new URL('../.sites-runtime/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../${input}`, import.meta.url), sql);
const result = spawnSync(process.execPath, [
  'node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--yes',
  '--config', config, '--persist-to', '.wrangler/state', '--file', input,
], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Initialized ${files.length} migrations in the local database. Run once for a fresh database.`);
