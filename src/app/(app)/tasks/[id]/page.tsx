import { notFound } from "next/navigation";

import { TaskDetailWorkspace } from "@/features/tasks/detail/task-detail-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canUpdateAssignedWork, isManager } from "@/server/policies/access";
import { getActivityFeedForDate } from "@/server/services/activity-feed";
import { getTaskReadModelById } from "@/server/services/task-read";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { getStaffExecutionFlags } from "@/lib/staff-execution-flags";
import { getTaskCompletionReadiness } from "@/server/services/task-execution-readiness";

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const task = await getTaskReadModelById(user, id);

  if (!task) {
    notFound();
  }

  const canComment = canUpdateAssignedWork({
    actor: user,
    assignedUserId: task.assignedUser.id,
    requiresManagerApproval: task.requiresManagerApproval,
    requestedAction: "comment"
  });
  const actorIsManager = isManager(user);
  const canUpdateStatus = actorIsManager || user.id === task.assignedUser.id;
  const canCreateAppointment = actorIsManager || user.id === task.assignedUser.id;
  const assignableUsers = actorIsManager ? await listActiveUserSummaries() : [];
  const activityFeed = await getActivityFeedForDate(user, task.boardDate);
  const activityEvents = activityFeed.events.filter((event) => event.task?.id === task.id);
  const executionFlags = getStaffExecutionFlags();
  const readiness = executionFlags.taskAcceptanceEnabled
    ? await getTaskCompletionReadiness(user, task.id)
    : null;

  return (
    <TaskDetailWorkspace
      activityEvents={activityEvents}
      actorIsManager={actorIsManager}
      assignableUsers={assignableUsers}
      canComment={canComment}
      canCreateAppointment={canCreateAppointment}
      canUpdateStatus={canUpdateStatus}
      readiness={readiness}
      task={task}
    />
  );
}
