import { PartsOperationsWorkspace } from "@/features/inventory/parts-operations-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPartsWorkspace } from "@/server/parts-ledger/service";
import { getPartsWaveOneWorkspace } from "@/server/parts-wave-one/service";
import { getServiceClosePartsWorkspace } from "@/server/service-close-parts/service";

export default async function PartsOperationsPage() {
  const user = await requireCurrentUser();
  const [ledger, waveOne, service] = await Promise.all([
    getPartsWorkspace(user),
    getPartsWaveOneWorkspace(user),
    getServiceClosePartsWorkspace(user)
  ]);

  return (
    <PartsOperationsWorkspace
      initial={JSON.parse(JSON.stringify({ ledger, service, waveOne }))}
    />
  );
}
