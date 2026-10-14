import { notFound, redirect } from "next/navigation";

import { TaskDetailWorkspace } from "@/features/tasks/detail/task-detail-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canUpdateAssignedWork, isManager } from "@/server/policies/access";
import { listActivityFeedEventsForTask } from "@/server/services/activity-feed";
import { getTaskReadModelById } from "@/server/services/task-read";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { getStaffExecutionFlags } from "@/lib/staff-execution-flags";
import { getTaskCompletionReadiness } from "@/server/services/task-execution-readiness";
import { getTaskSpecialistRoutes } from "@/server/technician-workspace/service";
import { ClaimRepairWorkflow } from "@/features/inventory/claim-repair-workflow";
import { getClaimWorkflowTaskContext } from "@/server/claims-workspace/repair-workflow-service";

export const dynamic = "force-dynamic";

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ returnTo?: string; view?: string; claimId?: string; review?: string }>;
};

export default async function TaskDetailPage({ params, searchParams }: TaskDetailPageProps) {
  const [user, { id }, resolvedSearchParams] = await Promise.all([
    requireCurrentUser(),
    params,
    searchParams
  ]);
  const requestedReturnTo = resolvedSearchParams.returnTo;
  const returnTo = requestedReturnTo?.startsWith("/tasks") ? requestedReturnTo : "/tasks";
  const task = await getTaskReadModelById(user, id);

  if (!task) {
    notFound();
  }

  const specialistRoute = (await getTaskSpecialistRoutes([task.id]))[task.id];
  if (specialistRoute) {
    redirect(specialistRoute);
  }

  const canComment = canUpdateAssignedWork({
    actor: user,
    assignedUserId: task.assignedUser.id,
    requiresManagerApproval: task.requiresManagerApproval,
    requestedAction: "comment"
  });
  const actorIsManager = isManager(user);
  const fullWorkbenchArchived = process.env.TASK_FULL_WORKBENCH_ARCHIVED !== "false";
  const canOpenFullWorkbench = !fullWorkbenchArchived || actorIsManager;
  const canUpdateStatus = actorIsManager || user.id === task.assignedUser.id;
  const canCreateAppointment = actorIsManager || user.id === task.assignedUser.id;
  const canReassign = actorIsManager || user.id === task.ownerUser?.id;
  const canManageCollaborators = canReassign || user.id === task.assignedUser.id;
  const executionFlags = getStaffExecutionFlags();
  const [assignableUsers, activityEvents, readiness] = await Promise.all([
    actorIsManager || canManageCollaborators ? listActiveUserSummaries() : Promise.resolve([]),
    listActivityFeedEventsForTask(user, task.id),
    executionFlags.taskAcceptanceEnabled ? getTaskCompletionReadiness(user, task.id) : Promise.resolve(null)
  ]);
  const requestedView = resolvedSearchParams.view === "simple" || resolvedSearchParams.view === "workbench"
    ? resolvedSearchParams.view
    : null;
  const initialView = requestedView === "workbench" && canOpenFullWorkbench ? "workbench" : "simple";
  const claimWorkflow = await getClaimWorkflowTaskContext(user, task, resolvedSearchParams.claimId).catch(() => null);

  return (
    <>
    {claimWorkflow ? <ClaimRepairWorkflow claimId={claimWorkflow.claimId} intakeReady={claimWorkflow.intakeReady} intakeTask={claimWorkflow.intakeTask} continueHref={claimWorkflow.href} /> : null}
    <TaskDetailWorkspace
      activityEvents={activityEvents}
      actorIsManager={actorIsManager}
      assignableUsers={assignableUsers}
      canComment={canComment}
      canManageCollaborators={canManageCollaborators}
      canCreateAppointment={canCreateAppointment}
      canUpdateStatus={canUpdateStatus}
      canOpenFullWorkbench={canOpenFullWorkbench}
      canReassign={canReassign}
      hasClaimWorkflow={Boolean(claimWorkflow)}
      compactReview={resolvedSearchParams.review === "compact"}
      initialView={initialView}
      readiness={readiness}
      returnTo={returnTo}
      task={task}
    />
    </>
  );
}
