import { EnterpriseLaborGuideConsole } from "@/features/diagnostics/enterprise-labor-guide-console";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function DiagnosticsLaborGuidePage() {
  await requireCurrentUser();
  return <EnterpriseLaborGuideConsole />;
}

