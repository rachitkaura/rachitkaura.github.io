import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const checks = readdirSync(new URL('./', import.meta.url))
  .filter(name => /^check-.*\.cjs$/.test(name)).sort();
const tests = readdirSync(new URL('../tests/', import.meta.url))
  .filter(name => /\.test\.(?:mjs|cjs)$/.test(name)).sort();
// The performance suite reads dist/client, so build once before pnpm test.
for (const file of [...checks.map(name => `scripts/${name}`), ...tests.map(name => `tests/${name}`)]) {
  console.log(`\nRunning ${file}`);
  const result = spawnSync(process.execPath, [file], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`\nPassed ${checks.length} service-check suites and ${tests.length} test files.`);
