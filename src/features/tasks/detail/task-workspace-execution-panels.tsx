"use client";

import { useState } from "react";

import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import type {
  TaskDetailChecklistItem,
  TaskDetailSubtaskItem
} from "@/features/tasks/detail/task-detail-mappers";
import { TaskExecutionChecklistCard } from "@/features/tasks/detail/task-execution-checklist-card";
import { TaskUpdatesCommentsCard } from "@/features/tasks/detail/task-updates-comments-card";

type UnifiedFeedItem = {
  actorName: string;
  createdAt: string;
  id: string;
  kind: "comment" | "event";
  message: string;
};

type TaskWorkspaceExecutionPanelsProps = {
  canComment: boolean;
  definitionOfDone: TaskDetailChecklistItem[];
  initialFeedItems: UnifiedFeedItem[];
  subtasks: TaskDetailSubtaskItem[];
  taskId: string;
};

export function TaskWorkspaceExecutionPanels({
  canComment,
  definitionOfDone,
  initialFeedItems,
  subtasks,
  taskId
}: TaskWorkspaceExecutionPanelsProps) {
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  function handleActivityChanged() {
    setActivityRefreshKey((currentValue) => currentValue + 1);
  }

  return (
    <>
      <TaskUpdatesCommentsCard
        canComment={canComment}
        initialFeedItems={initialFeedItems}
        onActivityChanged={handleActivityChanged}
        refreshKey={activityRefreshKey}
        taskId={taskId}
      />

      <TaskExecutionChecklistCard
        initialItems={definitionOfDone}
        kind={TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE}
        onActivityChanged={handleActivityChanged}
        taskId={taskId}
        title="Definition of Done"
      />

      <TaskExecutionChecklistCard
        allowCreate
        createPlaceholder="Add subtask"
        initialItems={subtasks}
        kind={TASK_CHECKLIST_ITEM_KIND.SUBTASK}
        onActivityChanged={handleActivityChanged}
        taskId={taskId}
        title="Subtasks"
      />
    </>
  );
}
