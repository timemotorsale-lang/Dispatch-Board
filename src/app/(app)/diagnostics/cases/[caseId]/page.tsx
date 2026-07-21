import { DiagnosticCaseUnavailable, DiagnosticCaseWorkspace } from "@/features/diagnostics/diagnostic-case-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDiagnosticCaseWorkspace } from "@/server/diagnostics/service";

export default async function DiagnosticCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const user = await requireCurrentUser();
  const { caseId } = await params;
  const outcome = await getDiagnosticCaseWorkspace(user, caseId).then((model) => ({ model })).catch((error: unknown) => ({ error }));
  if ("error" in outcome) return <DiagnosticCaseUnavailable message={outcome.error instanceof Error ? outcome.error.message : "The diagnostic case could not be loaded."} />;
  return <DiagnosticCaseWorkspace model={JSON.parse(JSON.stringify(outcome.model))} />;
}
