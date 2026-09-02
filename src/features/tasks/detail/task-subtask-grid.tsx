"use client";

import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import { TaskExecutionChecklistCard } from "@/features/tasks/detail/task-execution-checklist-card";
import type { TaskDetailSubtaskItem } from "@/features/tasks/detail/task-detail-mappers";

type TaskSubtaskGridProps = {
  initialItems: TaskDetailSubtaskItem[];
  taskId: string;
};

export function TaskSubtaskGrid({ initialItems, taskId }: TaskSubtaskGridProps) {
  return (
    <TaskExecutionChecklistCard
      allowCreate
      allowExpandToTask
      createPlaceholder="Add subtask"
      initialItems={initialItems}
      kind={TASK_CHECKLIST_ITEM_KIND.SUBTASK}
      taskId={taskId}
      title="Subtasks"
    />
  );
}
