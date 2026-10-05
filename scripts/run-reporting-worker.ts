import { prisma } from "../src/server/db/client";
import { runReportingWorker } from "../src/server/reporting/worker-service";

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--execute") || args.length > 1) throw new Error("Invalid worker options.");
  const result = await runReportingWorker({ execute: args.includes("--execute"), actorEmail: process.env.REPORTING_WORKER_ACTOR_EMAIL });
  console.log(JSON.stringify(result));
}
main().catch(() => {
  console.error("Reporting worker did not complete. Verify account authority, rollout gates and database health.");
  process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); });
