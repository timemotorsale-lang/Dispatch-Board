import { EnterpriseTaskIntakePrototype } from "@/features/prototype/enterprise-task-intake-prototype";
import { listActiveUserSummaries } from "@/server/services/user-summary";

export default async function TaskIntakePrototypePage() {
  const staff = await listActiveUserSummaries();
  return <EnterpriseTaskIntakePrototype staff={staff} />;
}
