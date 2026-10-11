import "dotenv/config";
import { scanPurchaseSource } from "../src/server/inventory-transfer/purchase-scanner";
import { prisma } from "../src/server/db/client";
async function main() {
  Object.assign(process.env, { NODE_ENV: "production" });
  const scanner = await scanPurchaseSource(Buffer.from("Purchase invoice release health check"), "text/plain");
  const tables = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('PurchaseImportJob', 'PurchaseImportTemplate')`;
  const result = { scannerReady: scanner.malwareStatus === "CLEAN" && scanner.scanner === "CLAMSCAN", schemaReady: Number(tables[0]?.count ?? 0) === 2, automaticFinancialApproval: false };
  console.log(JSON.stringify(result));
  if (!result.scannerReady || !result.schemaReady) process.exitCode = 1;
}
main().catch(() => { console.error("Import release checks could not finish. Check scanner and database configuration."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
