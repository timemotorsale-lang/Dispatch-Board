import { DiagnosticIntake } from "@/features/diagnostics/diagnostic-intake";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDiagnosticsCommandCenter } from "@/server/diagnostics/service";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";

export default async function DiagnosticIntakePage() {
  const user = await requireCurrentUser();
  const [options, repairOrders, commandCenter] = await Promise.all([
    getRepairOrderCreateOptions(user),
    listRepairOrders(user, { page: 1, pageSize: 100 }),
    getDiagnosticsCommandCenter(user),
  ]);

  return <DiagnosticIntake
    options={JSON.parse(JSON.stringify({ ...options, repairOrders: repairOrders.items }))}
    permissions={commandCenter.permissions}
    rollout={commandCenter.rollout}
    viewer={{ id: user.id, name: user.name }}
  />;
}
