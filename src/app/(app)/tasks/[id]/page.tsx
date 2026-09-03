import { notFound, redirect } from "next/navigation";

import { TaskDetailWorkspace } from "@/features/tasks/detail/task-detail-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canUpdateAssignedWork, isManager } from "@/server/policies/access";
import { getActivityFeedForDate } from "@/server/services/activity-feed";
import { getTaskReadModelById } from "@/server/services/task-read";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { getStaffExecutionFlags } from "@/lib/staff-execution-flags";
import { getTaskCompletionReadiness } from "@/server/services/task-execution-readiness";
import { getTaskSpecialistRoutes } from "@/server/technician-workspace/service";

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ returnTo?: string; view?: string }>;
};

export default async function TaskDetailPage({ params, searchParams }: TaskDetailPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
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
  const canManageCollaborators = actorIsManager || user.id === task.assignedUser.id;
  const assignableUsers = actorIsManager || canManageCollaborators ? await listActiveUserSummaries() : [];
  const activityFeed = await getActivityFeedForDate(user, task.boardDate);
  const activityEvents = activityFeed.events.filter((event) => event.task?.id === task.id);
  const executionFlags = getStaffExecutionFlags();
  const readiness = executionFlags.taskAcceptanceEnabled
    ? await getTaskCompletionReadiness(user, task.id)
    : null;
  const requestedView = resolvedSearchParams.view === "simple" || resolvedSearchParams.view === "workbench"
    ? resolvedSearchParams.view
    : null;
  const initialView = requestedView === "workbench" && canOpenFullWorkbench ? "workbench" : "simple";

  return (
    <TaskDetailWorkspace
      activityEvents={activityEvents}
      actorIsManager={actorIsManager}
      assignableUsers={assignableUsers}
      canComment={canComment}
      canManageCollaborators={canManageCollaborators}
      canCreateAppointment={canCreateAppointment}
      canUpdateStatus={canUpdateStatus}
      canOpenFullWorkbench={canOpenFullWorkbench}
      initialView={initialView}
      readiness={readiness}
      returnTo={returnTo}
      task={task}
    />
  );
}
