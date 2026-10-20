import { requireCurrentUser } from "@/server/auth/current-user";
import { ComplianceWorkbench } from "@/features/compliance/workbench";

export default async function CompliancePage() {
  await requireCurrentUser();
  return <ComplianceWorkbench />;
}
