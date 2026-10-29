import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const checks = ["check-api.cjs", "check-career.cjs", "check-live.cjs", "check-verification.cjs"];
for (const check of checks) {
  console.log(`\nRunning ${check}`);
  const result = spawnSync(process.execPath, [`scripts/${check}`], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("\nAll four Align check suites passed.");
