import { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, canManageAssignments } from "@/server/policies/access";
import {
  createTaskSavedViewRepository,
  type TaskSavedViewRecord,
  type TaskSavedViewRepository
} from "@/server/repositories/task-saved-view-repository";

const allowedQueueFilters = [
  "ALL",
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING",
  "WAITING_ON_PARTS",
  "WAITING_ON_APPROVAL",
  "READY_FOR_REVIEW",
  "OVERDUE",
  "COMPLETED",
  "UNASSIGNED"
] as const;
const allowedDepartmentFilters = [
  "INVENTORY",
  "SERVICE_ADVISOR",
  "SHOP",
  "SALES",
  "ADVERTISING",
  "ADMIN",
  "COLLECTIONS"
] as const;
const allowedViews = ["list", "board"] as const;
const allowedGroupBy = ["none", "status", "owner", "department"] as const;
const allowedColumns = [
  "priority",
  "taskNumber",
  "title",
  "status",
  "owner",
  "department",
  "dueTime",
  "vehicleCustomer",
  "age"
] as const;
const defaultColumns: TaskSavedViewColumn[] = [...allowedColumns];

type TaskSavedViewQueueFilter = (typeof allowedQueueFilters)[number];
type TaskSavedViewDepartmentFilter = (typeof allowedDepartmentFilters)[number];
type TaskSavedViewMode = (typeof allowedViews)[number];
type TaskSavedViewGroupBy = (typeof allowedGroupBy)[number];
type TaskSavedViewColumn = (typeof allowedColumns)[number];

export type TaskSavedViewConfig = {
  activeDepartmentFilter: TaskSavedViewDepartmentFilter | null;
  activeQueueFilter: TaskSavedViewQueueFilter;
  activeView: TaskSavedViewMode;
  groupBy: TaskSavedViewGroupBy;
  searchText: string;
  visibleColumns: TaskSavedViewColumn[];
};

export type TaskSavedViewModel = TaskSavedViewConfig & {
  createdAt: string;
  createdByUser: {
    email?: string;
    id: string;
    name: string;
  } | null;
  id: string;
  name: string;
  updatedAt: string;
};

type TaskSavedViewCreateInput = {
  config?: unknown;
  name?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isOneOf<T extends readonly string[]>(value: unknown, allowedValues: T): value is T[number] {
  return typeof value === "string" && allowedValues.includes(value);
}

function normalizeSavedViewName(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Saved view name is required.");
  }

  const name = value.trim();

  if (!name) {
    throw new Error("Saved view name is required.");
  }

  if (name.length > 80) {
    throw new Error("Saved view name must be 80 characters or fewer.");
  }

  return name;
}

function normalizeVisibleColumns(value: unknown): TaskSavedViewColumn[] {
  if (!Array.isArray(value)) {
    return defaultColumns;
  }

  const columns = value.filter((column): column is TaskSavedViewColumn =>
    isOneOf(column, allowedColumns)
  );

  if (!columns.includes("title")) {
    return defaultColumns;
  }

  return [...new Set(columns)];
}

export function normalizeTaskSavedViewConfig(value: unknown): TaskSavedViewConfig {
  if (!isPlainObject(value)) {
    throw new Error("Saved view config must be an object.");
  }

  const activeQueueFilter = isOneOf(value.activeQueueFilter, allowedQueueFilters)
    ? value.activeQueueFilter
    : "ALL";
  const activeDepartmentFilter =
    value.activeDepartmentFilter === null || value.activeDepartmentFilter === undefined
      ? null
      : isOneOf(value.activeDepartmentFilter, allowedDepartmentFilters)
        ? value.activeDepartmentFilter
        : null;
  const activeView = isOneOf(value.activeView, allowedViews) ? value.activeView : "list";
  const groupBy = isOneOf(value.groupBy, allowedGroupBy) ? value.groupBy : "none";
  const searchText = typeof value.searchText === "string" ? value.searchText.trim().slice(0, 120) : "";

  return {
    activeDepartmentFilter,
    activeQueueFilter,
    activeView,
    groupBy,
    searchText,
    visibleColumns: normalizeVisibleColumns(value.visibleColumns)
  };
}

function mapTaskSavedView(record: TaskSavedViewRecord): TaskSavedViewModel {
  const config = normalizeTaskSavedViewConfig(record.config);

  return {
    ...config,
    createdAt: record.createdAt.toISOString(),
    createdByUser: record.createdByUser
      ? {
          id: record.createdByUser.id,
          name: record.createdByUser.name,
          email: record.createdByUser.email || undefined
        }
      : null,
    id: record.id,
    name: record.name,
    updatedAt: record.updatedAt.toISOString()
  };
}

export async function listTaskSavedViews(
  user: AuthenticatedUser | null,
  repository: TaskSavedViewRepository = createTaskSavedViewRepository()
) {
  assertAuthenticatedUser(user);

  const savedViews = await repository.listSavedViews();

  return savedViews.map(mapTaskSavedView);
}

export async function createTaskSavedView(
  user: AuthenticatedUser | null,
  input: TaskSavedViewCreateInput,
  repository: TaskSavedViewRepository = createTaskSavedViewRepository()
) {
  const actor = assertAuthenticatedUser(user);

  if (!canManageAssignments(actor)) {
    throw new Error("Manager access required.");
  }

  if (!isPlainObject(input)) {
    throw new Error("Saved view payload must be an object.");
  }

  const savedView = await repository.createSavedView({
    config: normalizeTaskSavedViewConfig(input.config) as Prisma.InputJsonObject,
    createdByUserId: actor.id,
    name: normalizeSavedViewName(input.name)
  });

  return mapTaskSavedView(savedView);
}

export async function deleteTaskSavedView(
  user: AuthenticatedUser | null,
  id: string,
  repository: TaskSavedViewRepository = createTaskSavedViewRepository()
) {
  const actor = assertAuthenticatedUser(user);
  const savedViewId = id.trim();

  if (!canManageAssignments(actor)) {
    throw new Error("Manager access required.");
  }

  if (!savedViewId) {
    throw new Error("Saved view id is required.");
  }

  await repository.deleteSavedView(savedViewId);
}
