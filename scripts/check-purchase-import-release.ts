import "dotenv/config";
import { readFile } from "node:fs/promises";
import { verifyPurchaseScanner } from "../src/server/inventory-transfer/purchase-scanner";
import { verifyPurchaseOcr } from "../src/server/inventory-transfer/purchase-ocr-health";
import { validatePurchaseReleaseApproval } from "../src/lib/purchase-release-approval";
import { validatePurchaseOperationsConfiguration } from "../src/server/inventory-transfer/purchase-operations";
import { prisma } from "../src/server/db/client";
async function main() {
  Object.assign(process.env, { NODE_ENV: "production" });
  const scanner = await verifyPurchaseScanner();
  const ocr = await verifyPurchaseOcr();
  const tables = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('PurchaseImportJob', 'PurchaseImportTemplate')`;
  let approval: unknown = null;
  try { approval = JSON.parse(await readFile(process.env.IMPORT_RELEASE_APPROVAL_PATH || "/run/import-release-approval.json", "utf8")); } catch { /* Missing evidence must fail promotion. */ }
  const acceptance = validatePurchaseReleaseApproval(approval, process.env.APP_RELEASE_SHA || process.env.RELEASE_SHA || "");
  let operationsConfigured = false;
  try { await validatePurchaseOperationsConfiguration(); operationsConfigured = true; } catch { /* Invalid or revoked owner permissions block promotion. */ }
  const result = { scannerReady: scanner.clean && scanner.detectsTest, ocrReady: ocr.ready, schemaReady: Number(tables[0]?.count ?? 0) === 2, acceptance, operationsConfigured, automaticFinancialApproval: false };
  console.log(JSON.stringify(result));
  if (!result.scannerReady || !result.ocrReady || !result.schemaReady || !acceptance.ready || !result.operationsConfigured) process.exitCode = 1;
}
const watchdog = setTimeout(() => {
  console.error("Import release checks exceeded four minutes. Promotion is blocked.");
  process.exit(1);
}, 240_000);
watchdog.unref();
main().catch(() => { console.error("Import release checks could not finish. Check scanner and database configuration."); process.exitCode = 1; }).finally(async () => {
  await prisma.$disconnect();
  clearTimeout(watchdog);
});
