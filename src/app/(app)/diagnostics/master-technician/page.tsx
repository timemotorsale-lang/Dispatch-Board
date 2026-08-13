import { MasterTechnicianPrototype, type MasterTechnicianCaseDetail } from "@/features/diagnostics/master-technician-prototype";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDiagnosticCase, getDiagnosticsCommandCenter } from "@/server/diagnostics/service";

export default async function MasterTechnicianPage({ searchParams }: { searchParams: Promise<{ caseId?: string; q?: string }> }) {
  const [user, params] = await Promise.all([requireCurrentUser(), searchParams]);
  const [commandCenter, selectedCase] = await Promise.all([
    getDiagnosticsCommandCenter(user).catch(() => null),
    params.caseId ? getDiagnosticCase(user, params.caseId).catch(() => null) : Promise.resolve(null)
  ]);
  const caseChoices = commandCenter?.items.map((item) => ({
    id: item.id,
    version: item.version,
    label: item.vehicle.label,
    concern: item.concern,
    repairOrderNumber: item.repairOrder.repairOrderNumber,
    status: item.status
  })) ?? [];
  const initialCase: MasterTechnicianCaseDetail | null = selectedCase ? {
    id: selectedCase.id,
    version: selectedCase.version,
    label: selectedCase.vehicle.label,
    concern: selectedCase.concern,
    repairOrderNumber: selectedCase.repairOrder.repairOrderNumber,
    status: selectedCase.status,
    observations: selectedCase.observations.map((item) => ({ id: item.id, statement: item.statement })),
    measurements: selectedCase.measurements.map((item) => ({ id: item.id, quantity: item.quantity, value: item.value, unit: item.unit }))
  } : null;
  return <MasterTechnicianPrototype caseChoices={caseChoices} initialCase={initialCase} initialCaseId={params.caseId ?? ""} initialQuestion={params.q ?? ""} viewerName={user.name} />;
}
