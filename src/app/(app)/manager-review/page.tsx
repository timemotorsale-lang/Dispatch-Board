import type { ComponentProps } from "react";

import { ManagerReviewScreen } from "@/features/manager-review/manager-review-screen";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canReviewWorkflows } from "@/server/policies/access";
import {
  getManagerReviewViewModelForDate,
  getManagerReviewViewModelForToday,
  type ManagerReviewFocus
} from "@/server/services/manager-review";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { getTeamExecutionHealth } from "@/server/services/team-execution-health";

type ManagerReviewPageProps = {
  searchParams?: Promise<{
    date?: string | string[];
    focus?: string | string[];
  }>;
};

function normalizeFocus(value: string | string[] | undefined): ManagerReviewFocus {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    candidate === "READY_FOR_REVIEW" ||
    candidate === "BLOCKED" ||
    candidate === "WAITING_ON_PARTS" ||
    candidate === "WAITING_ON_APPROVAL"
    || candidate === "NEEDS_ASSIGNMENT"
  ) {
    return candidate;
  }

  return "";
}

export default async function ManagerReviewPage({ searchParams }: ManagerReviewPageProps) {
  const user = await requireCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedDate = Array.isArray(resolvedSearchParams?.date)
    ? resolvedSearchParams?.date[0]
    : resolvedSearchParams?.date;
  const initialFocus = normalizeFocus(resolvedSearchParams?.focus);

  if (!canReviewWorkflows(user)) {
    return (
      <section className="page-stack dashboard-page">
        <div className="dashboard-page-header">
          <div className="dashboard-page-copy">
            <span className="eyebrow">Protected review queue</span>
            <h1>Manager Review</h1>
            <p>
              This queue is reserved for managers because approval-required tasks can only be
              completed or reopened by a manager.
            </p>
          </div>
        </div>

        <div className="notice notice-danger" role="alert">
          <p>Manager access is required to review approval-ready tasks.</p>
        </div>
      </section>
    );
  }

  const screenProps: ComponentProps<typeof ManagerReviewScreen> = {
    boardDate: new Date().toISOString().slice(0, 10),
    boardExists: false,
    errorMessage: null,
    fullBoardHref: "/board",
    generatedAt: null,
    generationStatus: null,
    initialTasks: [],
    initialAttentionBuckets: [],
    initialNeedsAssignmentTasks: [],
    initialExecutionHealth: [],
    initialFocus,
    assignableUsers: []
  };

  try {
    const reviewQueue = requestedDate
      ? await getManagerReviewViewModelForDate(user, requestedDate)
      : await getManagerReviewViewModelForToday(user);
    const assignableUsers = await listActiveUserSummaries();
    screenProps.boardDate = reviewQueue.date;
    screenProps.boardExists = reviewQueue.boardExists;
    screenProps.fullBoardHref = `/board?date=${encodeURIComponent(reviewQueue.date)}`;
    screenProps.generatedAt = reviewQueue.generatedAt;
    screenProps.generationStatus = reviewQueue.generationStatus;
    screenProps.initialTasks = reviewQueue.tasks;
    screenProps.initialAttentionBuckets = reviewQueue.attentionBuckets;
    screenProps.initialNeedsAssignmentTasks = reviewQueue.needsAssignmentTasks;
    screenProps.assignableUsers = assignableUsers;
    screenProps.initialExecutionHealth = (await getTeamExecutionHealth(user, reviewQueue.date)).items;
  } catch (error) {
    screenProps.errorMessage =
      error instanceof Error ? error.message : "Unable to load the manager review queue right now.";
  }

  return <ManagerReviewScreen {...screenProps} />;
}
