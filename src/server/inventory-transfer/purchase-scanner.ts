import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, isAbsolute } from "node:path";
import { scanVehicleEvidence } from "@/server/vehicle-360/domain";

export type PurchaseScan = { malwareStatus: "CLEAN" | "DETECTED" | "ERROR"; scanner: string };
export async function scanPurchaseSource(bytes: Buffer, contentType: string): Promise<PurchaseScan> {
  const baseline = contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ? { malwareStatus: bytes.subarray(0, 4).toString("hex") === "504b0304" ? "CLEAN" : "DETECTED" } : scanVehicleEvidence(bytes, contentType);
  if (baseline.malwareStatus !== "CLEAN") return { malwareStatus: "DETECTED", scanner: "SIGNATURE_BASELINE" };
  const executable = process.env.IMPORT_MALWARE_SCANNER_PATH;
  if (!executable) {
    const development = process.env.NODE_ENV !== "production" && (process.env.NODE_ENV === "test" || process.env.IMPORT_MALWARE_MODE === "development-baseline");
    return { malwareStatus: development ? "CLEAN" : "ERROR", scanner: development ? "DEVELOPMENT_BASELINE_ONLY" : "SCANNER_NOT_CONFIGURED" };
  }
  if (!isAbsolute(executable)) return { malwareStatus: "ERROR", scanner: "SCANNER_PATH_INVALID" };
  const directory = await mkdtemp(join(tmpdir(), "purchase-scan-"));
  try {
    const path = join(directory, "source.bin");
    await writeFile(path, bytes, { mode: 0o600, flag: "wx" });
    // Reject encrypted and oversized containers, which scanners can otherwise skip as clean.
    const code = await new Promise<number>(resolve => execFile(executable, ["--no-summary", "--alert-encrypted=yes", "--alert-exceeds-max=yes", "--max-filesize=10M", "--max-scansize=30M", "--", path], { timeout: 60_000, maxBuffer: 64 * 1024, windowsHide: true }, error => resolve(error ? typeof error.code === "number" ? error.code : 2 : 0)));
    return { malwareStatus: code === 0 ? "CLEAN" : code === 1 ? "DETECTED" : "ERROR", scanner: "CLAMSCAN" };
  } catch {
    return { malwareStatus: "ERROR", scanner: "CLAMSCAN" };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
