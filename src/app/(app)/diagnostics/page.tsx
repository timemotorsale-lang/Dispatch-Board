import { DiagnosticsCommandCenter, DiagnosticsUnavailable } from "@/features/diagnostics/diagnostics-command-center";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDiagnosticsCommandCenter } from "@/server/diagnostics/service";

export default async function DiagnosticsPage() {
  const user = await requireCurrentUser();
  const outcome = await getDiagnosticsCommandCenter(user).then((model) => ({ model })).catch((error: unknown) => ({ error }));
  if ("error" in outcome) return <DiagnosticsUnavailable message={outcome.error instanceof Error ? outcome.error.message : "Diagnostics could not be loaded."} />;
  return <DiagnosticsCommandCenter model={JSON.parse(JSON.stringify(outcome.model))} />;
}
