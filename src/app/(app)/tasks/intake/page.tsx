import { EnterpriseTaskIntakePrototype } from "@/features/prototype/enterprise-task-intake-prototype";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canManageAssignments } from "@/server/policies/access";
import { listActiveUserSummaries } from "@/server/services/user-summary";

export default async function TaskIntakePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const [currentUser, staff] = await Promise.all([requireCurrentUser(), listActiveUserSummaries()]);
  const requestedReturnTo = (await searchParams).returnTo;
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "/tasks";

  return (
    <EnterpriseTaskIntakePrototype
      canAssignOthers={canManageAssignments(currentUser)}
      currentUserId={currentUser.id}
      returnTo={returnTo}
      staff={staff}
    />
  );
}
