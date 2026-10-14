import { EnterpriseTaskIntakePrototype } from "@/features/prototype/enterprise-task-intake-prototype";
import { normalizeUnifiedCrmTaskIntakeDefaults } from "@/lib/unified-crm-task-intake-handoff";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canManageAssignments } from "@/server/policies/access";
import { listActiveUserSummaries } from "@/server/services/user-summary";

export default async function TaskIntakePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [currentUser, staff] = await Promise.all([requireCurrentUser(), listActiveUserSummaries()]);
  const params = await searchParams;
  const requestedReturnTo = params.returnTo;
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "/tasks";
  const initialDraft = normalizeUnifiedCrmTaskIntakeDefaults(params);

  return (
    <EnterpriseTaskIntakePrototype
      canAssignOthers={canManageAssignments(currentUser)}
      currentUserId={currentUser.id}
      initialDraft={initialDraft}
      returnTo={returnTo}
      staff={staff}
    />
  );
}
