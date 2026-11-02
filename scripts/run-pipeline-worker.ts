import "dotenv/config";
import { prisma } from "../src/server/db/client";
import { createPrismaAuthStore } from "../src/server/auth/store";
import { runPipelineRecovery } from "../src/server/crm-next/pipeline-worker";

async function main() {
  const email = process.env.CRM_PIPELINE_WORKER_EMAIL;
  if (!email) throw new Error("Configure CRM_PIPELINE_WORKER_EMAIL for an authorized manager account. No records were processed.");
  const actor = await createPrismaAuthStore(prisma).findUserByEmail(email);
  let cursor: string | undefined;
  let failures = 0;
  do {
    const result = await runPipelineRecovery(actor, { cursor, retryFailed: process.argv.includes("--retry-failed") });
    console.log(JSON.stringify(result)); cursor = result.nextCursor ?? undefined;
    failures += result.failed;
  } while (cursor);
  if (failures) process.exitCode = 1;
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Worker failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
