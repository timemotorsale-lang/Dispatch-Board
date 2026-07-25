import { TroubleshootingReviewConsole, TroubleshootingReviewUnavailable } from "@/features/diagnostics/troubleshooting-review-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDiagnosticsCommandCenter } from "@/server/diagnostics/service";

export default async function DiagnosticsTroubleshootingReviewPage() {
  const user = await requireCurrentUser();
  const outcome = await getDiagnosticsCommandCenter(user).then((model) => ({ model })).catch((error: unknown) => ({ error }));
  if ("error" in outcome) return <TroubleshootingReviewUnavailable message={outcome.error instanceof Error ? outcome.error.message : "The troubleshooting review queue could not be loaded."} />;
  return <TroubleshootingReviewConsole model={JSON.parse(JSON.stringify(outcome.model))} />;
}
