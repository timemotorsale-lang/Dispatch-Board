import { notFound } from "next/navigation";

import { TaskDetailWorkspace } from "@/features/tasks/detail/task-detail-workspace";
import { canUpdateAssignedWork } from "@/server/policies/access";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getActivityFeedForDate } from "@/server/services/activity-feed";
import { seedTaskChecklistItems } from "@/server/services/task-checklist";
import { getTaskReadModelById } from "@/server/services/task-read";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { buildInitialChecklistSeed } from "@/features/tasks/detail/task-detail-mappers";

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const initialTask = await getTaskReadModelById(user, id);

  if (!initialTask) {
    notFound();
  }

  let task = initialTask;

  if (task.checklistItems.length === 0) {
    try {
      await seedTaskChecklistItems(task.id, buildInitialChecklistSeed(task));
      const refreshedTask = await getTaskReadModelById(user, id);

      if (!refreshedTask) {
        notFound();
      }

      task = refreshedTask;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (!message.includes("taskChecklistItem") && !message.includes("TaskChecklistItem")) {
        throw error;
      }
    }
  }

  const canComment = canUpdateAssignedWork({
    actor: user,
    assignedUserId: task.assignedUser.id,
    requiresManagerApproval: task.requiresManagerApproval,
    requestedAction: "comment"
  });
  const actorIsManager = isManager(user);
  const canUpdateStatus = actorIsManager || user.id === task.assignedUser.id;
  const assignableUsers = actorIsManager ? await listActiveUserSummaries() : [];
  const activityFeed = await getActivityFeedForDate(user, task.boardDate);
  const activityEvents = activityFeed.events.filter((event) => event.task?.id === task.id);

  return (
    <TaskDetailWorkspace
      activityEvents={activityEvents}
      actorIsManager={actorIsManager}
      assignableUsers={assignableUsers}
      canComment={canComment}
      canUpdateStatus={canUpdateStatus}
      task={task}
    />
  );
}
