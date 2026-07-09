import type { ActivityFeedEvent } from "@/server/services/activity-feed";
import type { BoardReadTask } from "@/server/services/board-read";

import { getProjectDefinition, projectDefinitions, type ProjectDefinition } from "./project-definitions";

export type ProjectStats = {
  active: number;
  blocked: number;
  waiting: number;
  readyForReview: number;
  completedToday: number;
  overdue: number;
};

export type ProjectHealth = {
  score: number;
  tone: "good" | "watch" | "risk";
  label: string;
  reason: string;
};

export type ProjectCardSummary = {
  project: ProjectDefinition;
  tasks: ProjectTaskLike[];
  stats: ProjectStats;
  owner: string | null;
  health: ProjectHealth;
};

export type ProjectStageColumn = {
  label: string;
  tasks: ProjectTaskLike[];
};

export type ProjectTaskLike = Omit<BoardReadTask, "assignedUser"> & {
  assignedUser: BoardReadTask["assignedUser"] | null;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getTaskHaystack(task: ProjectTaskLike) {
  return [
    task.title,
    task.description,
    task.vehicleReference,
    task.customerReference,
    task.blockerReason
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function taskMatchesKeywords(task: ProjectTaskLike, keywords: string[]) {
  const haystack = getTaskHaystack(task);

  return keywords.some((keyword) => haystack.includes(keyword));
}

function isDocumentationTask(task: ProjectTaskLike) {
  return taskMatchesKeywords(task, [
    "doc",
    "docs",
    "paperwork",
    "dmv",
    "title",
    "registration",
    "compliance",
    "filed",
    "filing"
  ]);
}

function isCustomerIssueTask(task: ProjectTaskLike) {
  return taskMatchesKeywords(task, [
    "customer issue",
    "complaint",
    "upset",
    "bad review",
    "escalation",
    "escalate"
  ]);
}

function isRentalLoanerTask(task: ProjectTaskLike) {
  return taskMatchesKeywords(task, [
    "rental",
    "loaner",
    "courtesy vehicle",
    "borrower",
    "lender car"
  ]);
}

function isManagementReviewTask(task: ProjectTaskLike) {
  return taskMatchesKeywords(task, [
    "manager review",
    "management review",
    "needs review",
    "approval",
    "approve",
    "escalation review",
    "executive review"
  ]);
}

export function getProjectSlugForTask(task: ProjectTaskLike) {
  if (isRentalLoanerTask(task)) {
    return "rentals-loaners";
  }

  if (isCustomerIssueTask(task)) {
    return "customer-issues";
  }

  if (task.workflowArea === "GENERAL_MANAGER" || isManagementReviewTask(task)) {
    return "management-review";
  }

  if (task.workflowArea === "INVENTORY") {
    return "inventory-management";
  }

  if (task.workflowArea === "SHOP") {
    return "service-repair-shop";
  }

  if (task.workflowArea === "ADVERTISING" || task.workflowArea === "MARKETING") {
    return "advertising-marketing";
  }

  if (task.workflowArea === "SALES") {
    return "sales";
  }

  if (task.workflowArea === "COLLECTIONS") {
    return "collections";
  }

  if (task.workflowArea === "ADMIN" || task.workflowArea === "GENERAL_MANAGER") {
    if (isDocumentationTask(task)) {
      return "documentation-compliance";
    }

    if (task.workflowArea === "ADMIN") {
      return "administration-office";
    }
  }

  return null;
}

export function getProjectTasks(tasks: ProjectTaskLike[], projectSlug: string) {
  return tasks.filter((task) => getProjectSlugForTask(task) === projectSlug);
}

export function getProjectStats(tasks: ProjectTaskLike[]): ProjectStats {
  const now = Date.now();

  return tasks.reduce<ProjectStats>(
    (stats, task) => {
      if (task.status !== "COMPLETED") {
        stats.active += 1;
      }

      if (task.status === "BLOCKED") {
        stats.blocked += 1;
      }

      if (task.status === "WAITING_ON_APPROVAL" || task.status === "WAITING_ON_PARTS") {
        stats.waiting += 1;
      }

      if (task.status === "READY_FOR_REVIEW") {
        stats.readyForReview += 1;
      }

      if (task.status === "COMPLETED") {
        stats.completedToday += 1;
      }

      if (task.status !== "COMPLETED" && new Date(task.dueAt).getTime() < now) {
        stats.overdue += 1;
      }

      return stats;
    },
    {
      active: 0,
      blocked: 0,
      waiting: 0,
      readyForReview: 0,
      completedToday: 0,
      overdue: 0
    }
  );
}

export function getProjectHealth(tasks: ProjectTaskLike[]): ProjectHealth {
  const stats = getProjectStats(tasks);

  if (!tasks.length) {
    return {
      score: 100,
      tone: "good",
      label: "Ready",
      reason: "No project-linked work is on today's board yet."
    };
  }

  let score = 100;
  score -= Math.min(42, stats.blocked * 12);
  score -= Math.min(30, stats.overdue * 9);
  score -= Math.min(16, stats.readyForReview * 4);
  score -= Math.min(12, stats.waiting * 3);
  score = Math.max(18, score);

  if (score >= 80) {
    return {
      score,
      tone: "good",
      label: "Healthy",
      reason:
        stats.blocked || stats.overdue
          ? "Pressure is present, but the project is still moving cleanly."
          : "No blocked or overdue work is currently dragging this project."
    };
  }

  if (score >= 60) {
    return {
      score,
      tone: "watch",
      label: "Watch",
      reason:
        stats.blocked
          ? `${stats.blocked} blocked item${stats.blocked === 1 ? "" : "s"} need intervention.`
          : "Review and waiting work are starting to stack up."
    };
  }

  return {
    score,
    tone: "risk",
    label: "At risk",
    reason:
      stats.overdue
        ? `${stats.overdue} overdue item${stats.overdue === 1 ? "" : "s"} are pulling health down.`
        : "Blocked and waiting work now needs leadership attention."
  };
}

export function getProjectOwner(tasks: ProjectTaskLike[]) {
  const owners = new Map<string, number>();

  for (const task of tasks) {
    const name = task.assignedUser?.name ?? "Unassigned";
    owners.set(name, (owners.get(name) ?? 0) + 1);
  }

  const [owner] = [...owners.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];

  return owner ?? null;
}

export function listProjectCardSummaries(tasks: ProjectTaskLike[]): ProjectCardSummary[] {
  return projectDefinitions.map((project) => {
    const projectTasks = getProjectTasks(tasks, project.slug);

    return {
      project,
      tasks: projectTasks,
      stats: getProjectStats(projectTasks),
      owner: getProjectOwner(projectTasks),
      health: getProjectHealth(projectTasks)
    };
  });
}

export function getProjectCardSummary(tasks: ProjectTaskLike[], projectSlug: string) {
  const project = getProjectDefinition(projectSlug);

  if (!project) {
    return null;
  }

  const projectTasks = getProjectTasks(tasks, projectSlug);

  return {
    project,
    tasks: projectTasks,
    stats: getProjectStats(projectTasks),
    owner: getProjectOwner(projectTasks),
    health: getProjectHealth(projectTasks)
  };
}

export function getProjectStageColumns(projectSlug: string, tasks: ProjectTaskLike[]): ProjectStageColumn[] {
  const project = getProjectDefinition(projectSlug);

  if (!project) {
    return [];
  }

  const columns = project.stages.map((stage) => ({
    label: stage.label,
    tasks: [] as ProjectTaskLike[]
  }));

  for (const task of tasks) {
    const haystack = getTaskHaystack(task);
    const matchedStageIndex = project.stages.findIndex((stage) =>
      stage.keywords.some((keyword) => haystack.includes(keyword))
    );

    if (matchedStageIndex >= 0) {
      columns[matchedStageIndex].tasks.push(task);
      continue;
    }

    if (task.status === "COMPLETED") {
      columns[columns.length - 1]?.tasks.push(task);
      continue;
    }

    if (task.status === "READY_FOR_REVIEW") {
      const reviewIndex = project.stages.findIndex((stage) =>
        normalizeText(stage.label).includes("review")
      );

      columns[reviewIndex >= 0 ? reviewIndex : columns.length - 1]?.tasks.push(task);
      continue;
    }

    if (task.status === "WAITING_ON_APPROVAL") {
      const waitingApprovalIndex = project.stages.findIndex((stage) =>
        normalizeText(stage.label).includes("approval")
      );

      columns[waitingApprovalIndex >= 0 ? waitingApprovalIndex : 0]?.tasks.push(task);
      continue;
    }

    if (task.status === "WAITING_ON_PARTS") {
      const waitingPartsIndex = project.stages.findIndex((stage) =>
        normalizeText(stage.label).includes("parts")
      );

      columns[waitingPartsIndex >= 0 ? waitingPartsIndex : 0]?.tasks.push(task);
      continue;
    }

    columns[0]?.tasks.push(task);
  }

  return columns;
}

export function getProjectActivity(events: ActivityFeedEvent[], tasks: ProjectTaskLike[]) {
  const taskIds = new Set(tasks.map((task) => task.id));

  return events.filter((event) => event.task && taskIds.has(event.task.id));
}
