import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { assertLaborStagingTarget } from "./lib/labor-staging-target.mjs";

const database = process.env.LABOR_STAGING_DATABASE_URL;
if (!database || process.env.LABOR_STAGING_CONFIRM !== "isolated") throw new Error("Set LABOR_STAGING_DATABASE_URL and LABOR_STAGING_CONFIRM=isolated explicitly. The development or production database is never selected automatically.");
assertLaborStagingTarget(database);
const proof = path.resolve("test-results/labor-staging");
mkdirSync(proof, { recursive: true });
const environment = { ...process.env, DATABASE_URL: database, E2E_DATABASE_URL: database, RUN_LABOR_STAGING_INTEGRATION: "1", LABOR_STAGING_CONFIRM: "isolated", PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3200", E2E_NEXT_DIST_DIR: ".next-e2e" };
async function step(name, argumentsList) {
  const log = path.join(proof, `${name}.log`);
  writeFileSync(log, `Isolated automated staging step: ${name}\n`);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, argumentsList, { env: environment, stdio: ["ignore", "pipe", "pipe"] });
    for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { appendFileSync(log, chunk); process.stdout.write(chunk); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${name} failed (${code}); see the captured staging log.`)));
  });
}
await step("candidate-migrations", ["node_modules/prisma/build/index.js", "migrate", "deploy"]);
await step("synthetic-seed", ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"]);
await step("policy-database-proof", ["node_modules/vitest/vitest.mjs", "run", "src/tests/integration/labor-catalog-staging.test.ts"]);
await step("authenticated-browser-proof", ["scripts/run-e2e.mjs", "src/tests/e2e/labor-catalog-staging.spec.ts", "--output=test-results/labor-staging/playwright"]);
console.log("Automated isolated staging checks completed. Customer authorization/QC acceptance, live shop capability review, rollback, monitoring and operator signoffs still require recorded evidence. This script does not authorize deployment.");
