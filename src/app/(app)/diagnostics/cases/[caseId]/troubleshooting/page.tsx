import { TechnicianTroubleshootingConsole, TechnicianTroubleshootingUnavailable } from "@/features/diagnostics/technician-troubleshooting-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getTechnicianTroubleshootingConsole } from "@/server/diagnostics/service";

export default async function TechnicianTroubleshootingPage({ params }: { params: Promise<{ caseId: string }> }) {
  const user = await requireCurrentUser();
  const { caseId } = await params;
  const outcome = await getTechnicianTroubleshootingConsole(user, caseId)
    .then((model) => ({ model }))
    .catch((error: unknown) => ({ error }));
  if ("error" in outcome) return <TechnicianTroubleshootingUnavailable message={outcome.error instanceof Error ? outcome.error.message : "The troubleshooting console could not be loaded."} />;
  return <TechnicianTroubleshootingConsole model={JSON.parse(JSON.stringify(outcome.model))} />;
}
