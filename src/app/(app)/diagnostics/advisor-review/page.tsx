import { DiagnosticAdvisorReviewConsole } from "@/features/diagnostics/advisor-review-console";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function DiagnosticsAdvisorReviewPage() {
  await requireCurrentUser();
  return <DiagnosticAdvisorReviewConsole />;
}
