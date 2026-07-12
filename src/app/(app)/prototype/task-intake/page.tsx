import { EnterpriseTaskIntakePrototype } from "@/features/prototype/enterprise-task-intake-prototype";
import { listActiveUserSummaries } from "@/server/services/user-summary";

export default async function TaskIntakePrototypePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const staff = await listActiveUserSummaries();
  const requestedReturnTo = (await searchParams).returnTo;
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "/tasks";
  return <EnterpriseTaskIntakePrototype returnTo={returnTo} staff={staff} />;
}
