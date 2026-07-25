import { TechnicianTroubleshootingConsole, TechnicianTroubleshootingUnavailable } from "@/features/diagnostics/technician-troubleshooting-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDiagnosticCaseWorkspace } from "@/server/diagnostics/service";
import { buildTechnicianTroubleshootingConsole } from "@/server/diagnostics/technician-troubleshooting-console";

export default async function TechnicianTroubleshootingPage({ params }: { params: Promise<{ caseId: string }> }) {
  const user = await requireCurrentUser();
  const { caseId } = await params;
  const outcome = await getDiagnosticCaseWorkspace(user, caseId)
    .then((workspace) => ({ model: buildTechnicianTroubleshootingConsole({ diagnosticCase: workspace.diagnosticCase, generatedAt: workspace.generatedAt, qualitySafetyGates: workspace.qualitySafetyGates }) }))
    .catch((error: unknown) => ({ error }));
  if ("error" in outcome) return <TechnicianTroubleshootingUnavailable message={outcome.error instanceof Error ? outcome.error.message : "The troubleshooting console could not be loaded."} />;
  return <TechnicianTroubleshootingConsole model={JSON.parse(JSON.stringify(outcome.model))} />;
}
