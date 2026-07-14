import { PartsCounterWorkspace } from "@/features/inventory/parts-counter-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPartsWaveOneWorkspace } from "@/server/parts-wave-one/service";

export default async function PartsCounterPage() {
  const user = await requireCurrentUser(), initial = await getPartsWaveOneWorkspace(user);
  return <PartsCounterWorkspace initial={JSON.parse(JSON.stringify(initial))} />;
}
