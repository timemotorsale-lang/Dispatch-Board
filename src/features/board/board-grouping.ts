import type { BoardReadTask } from "@/server/services/board-read";

export type BoardGroupMode = "assignee" | "status" | "workflowArea";

export type BoardFilters = {
  status: string;
  assigneeId: string;
  workflowArea: string;
  searchText: string;
};

export type BoardFilterOption = {
  value: string;
  label: string;
};

export type BoardTaskGroup = {
  key: string;
  label: string;
  taskCount: number;
  tasks: BoardTaskLike[];
};

export type BoardPresentation = {
  filteredTasks: BoardTaskLike[];
  groups: BoardTaskGroup[];
  filterOptions: {
    statuses: BoardFilterOption[];
    assignees: BoardFilterOption[];
    workflowAreas: BoardFilterOption[];
  };
};

type BoardTaskLike = Omit<BoardReadTask, "assignedUser"> & {
  assignedUser: BoardReadTask["assignedUser"] | null;
};

const STATUS_ORDER = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING_ON_PARTS",
  "WAITING_ON_APPROVAL",
  "READY_FOR_REVIEW",
  "COMPLETED"
] as const;

const WORKFLOW_ORDER = [
  "INVENTORY",
  "ADVERTISING",
  "MARKETING",
  "SALES",
  "ADMIN",
  "COLLECTIONS",
  "SHOP",
  "GENERAL_MANAGER"
] as const;

const FALLBACK_ASSIGNEE_KEY = "unassigned";
const FALLBACK_STATUS_KEY = "other-status";
const FALLBACK_WORKFLOW_KEY = "other-workflow";

export const DEFAULT_BOARD_FILTERS: BoardFilters = {
  status: "",
  assigneeId: "",
  workflowArea: "",
  searchText: ""
};

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function normalizeSearchValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getTaskAssigneeKey(task: BoardTaskLike) {
  return task.assignedUser?.id ?? FALLBACK_ASSIGNEE_KEY;
}

function getTaskStatusKey(task: BoardTaskLike) {
  return STATUS_ORDER.includes(task.status as (typeof STATUS_ORDER)[number])
    ? task.status
    : FALLBACK_STATUS_KEY;
}

function getTaskWorkflowKey(task: BoardTaskLike) {
  return WORKFLOW_ORDER.includes(task.workflowArea as (typeof WORKFLOW_ORDER)[number])
    ? task.workflowArea
    : FALLBACK_WORKFLOW_KEY;
}

function getGroupDescriptor(task: BoardTaskLike, groupMode: BoardGroupMode) {
  if (groupMode === "assignee") {
    return {
      key: getTaskAssigneeKey(task),
      label: task.assignedUser?.name ?? "Unassigned"
    };
  }

  if (groupMode === "status") {
    return {
      key: getTaskStatusKey(task),
      label:
        getTaskStatusKey(task) === FALLBACK_STATUS_KEY ? "Other" : formatEnumLabel(getTaskStatusKey(task))
    };
  }

  return {
    key: getTaskWorkflowKey(task),
    label:
      getTaskWorkflowKey(task) === FALLBACK_WORKFLOW_KEY
        ? "Other"
        : formatEnumLabel(getTaskWorkflowKey(task))
  };
}

function getSearchHaystack(task: BoardTaskLike) {
  return [
    task.title,
    task.description,
    task.vehicleReference,
    task.customerReference,
    task.blockerReason,
    task.assignedUser?.name,
    task.assignedUser?.email,
    formatEnumLabel(task.status),
    formatEnumLabel(task.workflowArea)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesFilters(task: BoardTaskLike, filters: BoardFilters) {
  if (filters.status && task.status !== filters.status) {
    return false;
  }

  if (filters.assigneeId && getTaskAssigneeKey(task) !== filters.assigneeId) {
    return false;
  }

  if (filters.workflowArea && task.workflowArea !== filters.workflowArea) {
    return false;
  }

  const normalizedSearchText = normalizeSearchValue(filters.searchText);

  if (normalizedSearchText && !getSearchHaystack(task).includes(normalizedSearchText)) {
    return false;
  }

  return true;
}

function compareGroupLabels(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    sensitivity: "base"
  });
}

function sortGroups(groups: BoardTaskGroup[], groupMode: BoardGroupMode) {
  if (groupMode === "status") {
    const statusOrder = new Map(
      [...STATUS_ORDER, FALLBACK_STATUS_KEY].map((value, index) => [value, index])
    );

    return [...groups].sort(
      (left, right) =>
        (statusOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
        (statusOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER)
    );
  }

  if (groupMode === "workflowArea") {
    const workflowOrder = new Map(
      [...WORKFLOW_ORDER, FALLBACK_WORKFLOW_KEY].map((value, index) => [value, index])
    );

    return [...groups].sort(
      (left, right) =>
        (workflowOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
        (workflowOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER)
    );
  }

  return [...groups].sort((left, right) => {
    if (left.key === FALLBACK_ASSIGNEE_KEY) {
      return 1;
    }

    if (right.key === FALLBACK_ASSIGNEE_KEY) {
      return -1;
    }

    return compareGroupLabels(left.label, right.label);
  });
}

function createStatusOptions(tasks: BoardTaskLike[]) {
  const seenStatuses = new Set(tasks.map((task) => task.status));
  const orderedStatuses = STATUS_ORDER.filter((status) => seenStatuses.has(status)).map((status) => ({
    value: status,
    label: formatEnumLabel(status)
  }));
  const knownStatuses = new Set(STATUS_ORDER);
  const otherStatuses = [...seenStatuses]
    .filter((status) => !knownStatuses.has(status as (typeof STATUS_ORDER)[number]))
    .sort(compareGroupLabels)
    .map((status) => ({
      value: status,
      label: formatEnumLabel(status)
    }));

  return [...orderedStatuses, ...otherStatuses];
}

function createAssigneeOptions(tasks: BoardTaskLike[]) {
  const options = new Map<string, BoardFilterOption>();

  for (const task of tasks) {
    const key = getTaskAssigneeKey(task);

    if (options.has(key)) {
      continue;
    }

    options.set(key, {
      value: key,
      label: task.assignedUser?.name ?? "Unassigned"
    });
  }

  return [...options.values()].sort((left, right) => {
    if (left.value === FALLBACK_ASSIGNEE_KEY) {
      return 1;
    }

    if (right.value === FALLBACK_ASSIGNEE_KEY) {
      return -1;
    }

    return compareGroupLabels(left.label, right.label);
  });
}

function createWorkflowOptions(tasks: BoardTaskLike[]) {
  const seenWorkflowAreas = new Set(tasks.map((task) => task.workflowArea));
  const orderedWorkflowAreas = WORKFLOW_ORDER.filter((workflowArea) =>
    seenWorkflowAreas.has(workflowArea)
  ).map((workflowArea) => ({
    value: workflowArea,
    label: formatEnumLabel(workflowArea)
  }));
  const knownWorkflowAreas = new Set(WORKFLOW_ORDER);
  const otherWorkflowAreas = [...seenWorkflowAreas]
    .filter((workflowArea) => !knownWorkflowAreas.has(workflowArea as (typeof WORKFLOW_ORDER)[number]))
    .sort(compareGroupLabels)
    .map((workflowArea) => ({
      value: workflowArea,
      label: formatEnumLabel(workflowArea)
    }));

  return [...orderedWorkflowAreas, ...otherWorkflowAreas];
}

export function formatBoardEnumLabel(value: string) {
  return formatEnumLabel(value);
}

export function getBoardPresentation(
  tasks: BoardTaskLike[],
  groupMode: BoardGroupMode,
  filters: BoardFilters
): BoardPresentation {
  const filteredTasks = tasks.filter((task) => matchesFilters(task, filters));
  const groupsByKey = new Map<string, BoardTaskGroup>();

  for (const task of filteredTasks) {
    const descriptor = getGroupDescriptor(task, groupMode);
    const existingGroup = groupsByKey.get(descriptor.key);

    if (existingGroup) {
      existingGroup.tasks.push(task);
      existingGroup.taskCount += 1;
      continue;
    }

    groupsByKey.set(descriptor.key, {
      key: descriptor.key,
      label: descriptor.label,
      taskCount: 1,
      tasks: [task]
    });
  }

  return {
    filteredTasks,
    groups: sortGroups([...groupsByKey.values()], groupMode),
    filterOptions: {
      statuses: createStatusOptions(tasks),
      assignees: createAssigneeOptions(tasks),
      workflowAreas: createWorkflowOptions(tasks)
    }
  };
}
