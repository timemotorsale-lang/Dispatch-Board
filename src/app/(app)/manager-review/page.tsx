import type { ComponentProps } from "react";

import { ManagerReviewScreen } from "@/features/manager-review/manager-review-screen";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canReviewWorkflows } from "@/server/policies/access";
import { getManagerReviewViewModelForToday } from "@/server/services/manager-review";

export default async function ManagerReviewPage() {
  const user = await requireCurrentUser();

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
    initialAttentionBuckets: []
  };

  try {
    const reviewQueue = await getManagerReviewViewModelForToday(user);
    screenProps.boardDate = reviewQueue.date;
    screenProps.boardExists = reviewQueue.boardExists;
    screenProps.fullBoardHref = `/board?date=${encodeURIComponent(reviewQueue.date)}`;
    screenProps.generatedAt = reviewQueue.generatedAt;
    screenProps.generationStatus = reviewQueue.generationStatus;
    screenProps.initialTasks = reviewQueue.tasks;
    screenProps.initialAttentionBuckets = reviewQueue.attentionBuckets;
  } catch (error) {
    screenProps.errorMessage =
      error instanceof Error ? error.message : "Unable to load the manager review queue right now.";
  }

  return <ManagerReviewScreen {...screenProps} />;
}
