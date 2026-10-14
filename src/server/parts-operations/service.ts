import type { AuthenticatedUser } from "@/server/auth/store";
import { getPartsWorkspace } from "@/server/parts-ledger/service";
import { getPartsWaveOneWorkspace } from "@/server/parts-wave-one/service";
import { getPartsOperationsSource } from "@/server/service-close-parts/service";

export async function getPartsOperationsWorkspace(actor: AuthenticatedUser | null) {
  const [ledger, waveOne, service] = await Promise.all([
    getPartsWorkspace(actor),
    getPartsWaveOneWorkspace(actor),
    getPartsOperationsSource(actor),
  ]);
  return {
    contractVersion: "parts-operations/r8.0.0",
    generatedAt: new Date().toISOString(),
    capability: {
      barcodeHardware: "UNVERIFIED_MANUAL_FALLBACK",
      recommendations: "ADVISORY_NON_EXECUTING",
      vendorAdapters: "DISABLED",
    },
    ledger,
    service,
    waveOne,
  };
}
