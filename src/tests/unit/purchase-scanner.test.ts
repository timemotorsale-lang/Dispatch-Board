import { afterEach, describe, expect, it, vi } from "vitest";
import { scanPurchaseSource } from "@/server/inventory-transfer/purchase-scanner";
afterEach(() => vi.unstubAllEnvs());
describe("purchase scanning gate", () => {
  it("fails closed in production without a scanner", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("IMPORT_MALWARE_SCANNER_PATH", ""); vi.stubEnv("IMPORT_MALWARE_MODE", "development-baseline");
    expect(await scanPurchaseSource(Buffer.from("invoice"), "text/plain")).toMatchObject({ malwareStatus: "ERROR" });
  });
  it("requires explicit local development opt-in", async () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("IMPORT_MALWARE_SCANNER_PATH", ""); vi.stubEnv("IMPORT_MALWARE_MODE", "");
    expect((await scanPurchaseSource(Buffer.from("invoice"), "text/plain")).malwareStatus).toBe("ERROR");
    vi.stubEnv("IMPORT_MALWARE_MODE", "development-baseline");
    expect((await scanPurchaseSource(Buffer.from("invoice"), "text/plain")).malwareStatus).toBe("CLEAN");
  });
  it("rejects unsafe signatures even in development", async () => {
    vi.stubEnv("IMPORT_MALWARE_SCANNER_PATH", "");
    expect((await scanPurchaseSource(Buffer.from("MZ unsafe"), "text/plain")).malwareStatus).toBe("DETECTED");
  });
  it("rejects relative scanner executables", async () => {
    vi.stubEnv("IMPORT_MALWARE_SCANNER_PATH", "clamscan");
    expect((await scanPurchaseSource(Buffer.from("invoice"), "text/plain")).malwareStatus).toBe("ERROR");
  });
});
