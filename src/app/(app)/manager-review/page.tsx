import type { ComponentProps } from "react";

import { ManagerReviewScreen } from "@/features/manager-review/manager-review-screen";
import { GovernanceDecisionWorkspace } from "@/features/inventory/governance-decision-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canReviewWorkflows } from "@/server/policies/access";
import {
  getManagerReviewViewModelForDate,
  getManagerReviewViewModelForToday,
  type ManagerReviewFocus
} from "@/server/services/manager-review";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { getTeamExecutionHealth } from "@/server/services/team-execution-health";
import { getInventoryGovernanceConsole } from "@/server/inventory-governance/service";

type ManagerReviewPageProps = {
  searchParams?: Promise<{
    date?: string | string[];
    focus?: string | string[];
    scope?: string | string[];
    view?: string | string[];
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
  const scope = Array.isArray(resolvedSearchParams?.scope) ? resolvedSearchParams.scope[0] : resolvedSearchParams?.scope;
  const view = Array.isArray(resolvedSearchParams?.view) ? resolvedSearchParams.view[0] : resolvedSearchParams?.view;

  if (!canReviewWorkflows(user)) {
    return (
      <section className="page-stack dashboard-page">
        <div className="dashboard-page-header">
          <div className="dashboard-page-copy">
            <span className="eyebrow">Protected review queue</span>
            <h1>Manager Review Command Center</h1>
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

  if (view === "reviews" || view === "approvals" || scope === "inventory" || scope === "shop" || scope === "parts") {
    return <GovernanceDecisionWorkspace model={await getInventoryGovernanceConsole(user)} scope={scope ?? "all"} view={view ?? "reviews"} />;
  }

  const screenProps: ComponentProps<typeof ManagerReviewScreen> = {
    boardDate: new Date().toISOString().slice(0, 10),
    boardExists: false,
    errorMessage: null,
    fullBoardHref: "/board",
    generatedAt: null,
    generationStatus: null,
    initialCommandItems: [],
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
    screenProps.initialCommandItems = reviewQueue.commandItems;
    screenProps.assignableUsers = assignableUsers;
    screenProps.initialExecutionHealth = (await getTeamExecutionHealth(user, reviewQueue.date)).items;
  } catch (error) {
    screenProps.errorMessage =
      error instanceof Error ? error.message : "Unable to load the manager review queue right now.";
  }

  return <ManagerReviewScreen {...screenProps} />;
}
