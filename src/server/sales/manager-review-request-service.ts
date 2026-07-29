import type { AuthenticatedUser } from "@/server/auth/store";

import {
  normalizeSalesManagerReviewRequest,
  type NormalizedSalesManagerReviewRequest
} from "./manager-review-request-validation";

export type SalesManagerReviewRequestBlockedResult = {
  blocked: true;
  guardrails: readonly string[];
  normalizedRequest: NormalizedSalesManagerReviewRequest;
  reason: string;
  status: "backend-foundation-only";
  workflowLive: false;
};

export const salesManagerReviewRequestServiceGuardrails = [
  "No task creation",
  "No quote submission",
  "No customer messaging",
  "No vehicle hold or reservation",
  "No finance decision",
  "No discount approval"
] as const;

export function submitSalesManagerReviewRequest(
  actor: AuthenticatedUser | null,
  value: unknown
): SalesManagerReviewRequestBlockedResult {
  if (!actor) {
    throw new Error("Authentication required.");
  }

  return {
    blocked: true,
    guardrails: salesManagerReviewRequestServiceGuardrails,
    normalizedRequest: normalizeSalesManagerReviewRequest(value),
    reason: "Dedicated audited manager-review persistence is not enabled yet.",
    status: "backend-foundation-only",
    workflowLive: false
  };
}

export function salesManagerReviewRequestServiceBlocksWrites() {
  return salesManagerReviewRequestServiceGuardrails.includes("No task creation");
}

export function salesManagerReviewRequestServiceReturnsFoundationOnlyStatus(
  actor: AuthenticatedUser,
  value: unknown
) {
  return submitSalesManagerReviewRequest(actor, value).status === "backend-foundation-only";
}
