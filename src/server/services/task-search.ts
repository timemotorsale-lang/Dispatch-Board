import { Prisma, TaskStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";

const taskSearchSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueAt: true,
  workflowArea: true,
  sourceType: true,
  vehicleReference: true,
  customerReference: true,
  assignedUserId: true,
  assignedUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  collaborators: {
    select: {
      user: {
        select: {
          id: true
        }
      }
    }
  }
} satisfies Prisma.TaskSelect;

export type TaskSearchResult = {
  assignedUserName: string;
  dueAt: string;
  id: string;
  matchedOn: string;
  priority: string;
  sourceType: string;
  status: TaskStatus;
  title: string;
  workflowArea: string;
};

const statusSearchTerms: Array<{ status: TaskStatus; terms: string[] }> = [
  { status: TaskStatus.NOT_STARTED, terms: ["not started", "not-started", "new", "open", "unstarted"] },
  { status: TaskStatus.IN_PROGRESS, terms: ["in progress", "in-progress", "active", "started", "working"] },
  { status: TaskStatus.BLOCKED, terms: ["blocked", "stuck", "hold"] },
  { status: TaskStatus.WAITING_ON_PARTS, terms: ["waiting on parts", "waiting parts", "parts", "parts hold"] },
  { status: TaskStatus.WAITING_ON_APPROVAL, terms: ["waiting on approval", "waiting approval", "approval", "authorization"] },
  { status: TaskStatus.READY_FOR_REVIEW, terms: ["ready for review", "review", "qc", "quality review"] },
  { status: TaskStatus.COMPLETED, terms: ["completed", "complete", "closed", "done", "finished"] }
];

function normalizeQuery(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 160) : "";
}

function parseLimit(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 8;
  return Math.max(1, Math.min(20, Math.trunc(numeric)));
}

function normalizeText(value: string) {
  return value.toLocaleLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function statusMatches(query: string) {
  const normalized = normalizeText(query);
  return statusSearchTerms
    .filter((item) => item.terms.some((term) => normalized.includes(term)))
    .map((item) => item.status);
}

function textTokens(query: string, statuses: TaskStatus[]) {
  const normalized = normalizeText(query);
  const withoutStatuses = statusSearchTerms.reduce((value, item) => {
    if (!statuses.includes(item.status)) return value;
    return item.terms.reduce((next, term) => next.replaceAll(term, " "), value);
  }, normalized);
  return withoutStatuses.split(/\s+/).map((token) => token.trim()).filter((token) => token.length >= 2);
}

function formatMatchedOn(input: {
  customerReference: string | null;
  status: TaskStatus;
  vehicleReference: string | null;
  workflowArea: string;
}) {
  return [
    input.customerReference,
    input.vehicleReference,
    input.workflowArea.replaceAll("_", " ").toLocaleLowerCase(),
    input.status.replaceAll("_", " ").toLocaleLowerCase()
  ].filter(Boolean).join(" · ");
}

export async function searchTasks(actor: AuthenticatedUser | null, input: { limit?: unknown; query?: unknown } = {}): Promise<TaskSearchResult[]> {
  const user = assertAuthenticatedUser(actor);
  const query = normalizeQuery(input.query);
  const limit = parseLimit(input.limit);
  const statuses = statusMatches(query);
  const tokens = textTokens(query, statuses);
  const textFilters = tokens.map<Prisma.TaskWhereInput>((token) => ({
    OR: [
      { id: { contains: token, mode: "insensitive" } },
      { title: { contains: token, mode: "insensitive" } },
      { description: { contains: token, mode: "insensitive" } },
      { customerReference: { contains: token, mode: "insensitive" } },
      { vehicleReference: { contains: token, mode: "insensitive" } },
      { assignedUser: { name: { contains: token, mode: "insensitive" } } }
    ]
  }));
  const visibilityFilter: Prisma.TaskWhereInput = isManager(user)
    ? {}
    : {
        OR: [
          { assignedUserId: user.id },
          { collaborators: { some: { userId: user.id } } },
          { isClaimable: true }
        ]
      };
  const where: Prisma.TaskWhereInput = {
    ...visibilityFilter,
    ...(statuses.length ? { status: { in: statuses } } : {}),
    ...(textFilters.length ? { AND: textFilters } : {})
  };

  if (!query) return [];

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { dueAt: "desc" },
      { updatedAt: "desc" },
      { id: "asc" }
    ],
    select: taskSearchSelect,
    take: limit
  });

  return tasks.map((task) => ({
    assignedUserName: task.assignedUser.name,
    dueAt: task.dueAt.toISOString(),
    id: task.id,
    matchedOn: formatMatchedOn(task),
    priority: task.priority,
    sourceType: task.sourceType,
    status: task.status,
    title: task.title,
    workflowArea: task.workflowArea
  }));
}
