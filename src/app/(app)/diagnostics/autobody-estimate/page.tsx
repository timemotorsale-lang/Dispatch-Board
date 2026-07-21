import { DiagnosticAutobodyEstimateConsole } from "@/features/diagnostics/autobody-estimate-console";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function DiagnosticsAutobodyEstimatePage() {
  await requireCurrentUser();
  return <DiagnosticAutobodyEstimateConsole />;
}
