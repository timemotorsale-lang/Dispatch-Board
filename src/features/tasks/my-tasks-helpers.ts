import { TaskStatus } from "@prisma/client";

import type { BoardReadTask } from "@/server/services/board-read";

export type MyTasksFilter =
  | "all"
  | "open"
  | "dueSoon"
  | "blockedWaiting"
  | "readyForReview"
  | "completed";

export type MyTasksFilterOption = {
  value: MyTasksFilter;
  label: string;
};

export function getTasksAssignedToUser(tasks: BoardReadTask[], userId: string) {
  return tasks.filter((task) => task.assignedUser.id === userId);
}

function isCompleted(task: Pick<BoardReadTask, "status">) {
  return task.status === TaskStatus.COMPLETED;
}

function isBlockedOrWaiting(task: Pick<BoardReadTask, "status">) {
  return (
    task.status === TaskStatus.BLOCKED ||
    task.status === TaskStatus.WAITING_ON_PARTS ||
    task.status === TaskStatus.WAITING_ON_APPROVAL
  );
}

function isDueSoon(task: Pick<BoardReadTask, "status" | "dueAt">, now: Date) {
  if (isCompleted(task)) {
    return false;
  }

  const dueAtTime = new Date(task.dueAt).getTime();
  const minutesUntilDue = (dueAtTime - now.getTime()) / 60000;

  return minutesUntilDue <= 120;
}

export function filterMyTasks(tasks: BoardReadTask[], filter: MyTasksFilter, now: Date) {
  if (filter === "all") {
    return tasks;
  }

  if (filter === "open") {
    return tasks.filter((task) => !isCompleted(task));
  }

  if (filter === "dueSoon") {
    return tasks.filter((task) => isDueSoon(task, now));
  }

  if (filter === "blockedWaiting") {
    return tasks.filter(isBlockedOrWaiting);
  }

  if (filter === "readyForReview") {
    return tasks.filter((task) => task.status === TaskStatus.READY_FOR_REVIEW);
  }

  return tasks.filter((task) => task.status === TaskStatus.COMPLETED);
}

export function getMyTasksFilterOptions(tasks: BoardReadTask[], now: Date): MyTasksFilterOption[] {
  return [
    {
      value: "all",
      label: `All (${tasks.length})`
    },
    {
      value: "open",
      label: `Open (${tasks.filter((task) => !isCompleted(task)).length})`
    },
    {
      value: "dueSoon",
      label: `Due soon (${tasks.filter((task) => isDueSoon(task, now)).length})`
    },
    {
      value: "blockedWaiting",
      label: `Blocked / Waiting (${tasks.filter(isBlockedOrWaiting).length})`
    },
    {
      value: "readyForReview",
      label: `Ready for Review (${tasks.filter((task) => task.status === TaskStatus.READY_FOR_REVIEW).length})`
    },
    {
      value: "completed",
      label: `Completed (${tasks.filter((task) => task.status === TaskStatus.COMPLETED).length})`
    }
  ];
}

function createStatusOption(value: TaskStatus, label?: string) {
  return {
    value,
    label: label ?? value
  };
}

export function getAllowedMyTaskStatuses(
  task: Pick<BoardReadTask, "status" | "requiresManagerApproval">,
  actorIsManager: boolean
) {
  if (task.status === TaskStatus.COMPLETED) {
    return [];
  }

  if (task.status === TaskStatus.READY_FOR_REVIEW) {
    if (actorIsManager && task.requiresManagerApproval) {
      return [
        createStatusOption(TaskStatus.READY_FOR_REVIEW, "Ready for Review"),
        createStatusOption(TaskStatus.IN_PROGRESS, "Send back to In Progress"),
        createStatusOption(TaskStatus.COMPLETED, "Complete")
      ];
    }

    return [createStatusOption(TaskStatus.READY_FOR_REVIEW, "Ready for Review")];
  }

  const options = [
    createStatusOption(TaskStatus.NOT_STARTED, "Not Started"),
    createStatusOption(TaskStatus.IN_PROGRESS, "In Progress"),
    createStatusOption(TaskStatus.BLOCKED, "Blocked"),
    createStatusOption(TaskStatus.WAITING_ON_PARTS, "Waiting on Parts"),
    createStatusOption(TaskStatus.WAITING_ON_APPROVAL, "Waiting on Approval")
  ];

  if (task.requiresManagerApproval) {
    options.push(createStatusOption(TaskStatus.READY_FOR_REVIEW, "Ready for Review"));
  } else {
    options.push(createStatusOption(TaskStatus.COMPLETED, "Completed"));
  }

  return options;
}

export function getPrimaryMyTaskStatusActions(
  task: Pick<BoardReadTask, "status" | "requiresManagerApproval">,
  actorIsManager: boolean
) {
  return getAllowedMyTaskStatuses(task, actorIsManager).filter(
    (statusOption) => statusOption.value !== task.status
  );
}

export function getTaskActionLabel(
  nextStatus: TaskStatus,
  currentStatus: TaskStatus,
  requiresManagerApproval: boolean
) {
  if (nextStatus === TaskStatus.IN_PROGRESS) {
    return currentStatus === TaskStatus.NOT_STARTED ? "Start" : "Resume";
  }

  if (nextStatus === TaskStatus.BLOCKED) {
    return "Block task";
  }

  if (nextStatus === TaskStatus.WAITING_ON_PARTS) {
    return "Waiting on Parts";
  }

  if (nextStatus === TaskStatus.WAITING_ON_APPROVAL) {
    return "Waiting on Approval";
  }

  if (nextStatus === TaskStatus.READY_FOR_REVIEW) {
    return "Ready for Review";
  }

  if (nextStatus === TaskStatus.COMPLETED) {
    return requiresManagerApproval ? "Approve completion" : "Complete";
  }

  return "Save update";
}
