import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";

import { normalizeSalesManagerReviewRequest } from "./manager-review-request-validation";
import {
  createSalesManagerReviewRequestRepository,
  type SalesManagerReviewPersistResult
} from "./manager-review-request-repository";

export type SalesManagerReviewRequestCreatedResult = {
  auditEventId: string | null;
  commandId: string;
  correlationId: string;
  duplicate: boolean;
  guardrails: readonly string[];
  idempotencyKey: string;
  status: "created" | "duplicate";
  task: SalesManagerReviewPersistResult["task"];
  workflowLive: true;
};

export const salesManagerReviewRequestServiceGuardrails = [
  "Only audited Manager Review task creation",
  "No quote submission",
  "No customer messaging",
  "No vehicle hold or reservation",
  "No finance decision",
  "No discount approval"
] as const;

type Dependencies = {
  boardDate?: string;
  now?: () => Date;
  organizationId?: string;
  repository?: ReturnType<typeof createSalesManagerReviewRequestRepository>;
};

function formatBoardDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function deps(input: Dependencies = {}) {
  const now = input.now ?? (() => new Date());

  return {
    boardDate: input.boardDate ?? formatBoardDate(now()),
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    repository: input.repository ?? createSalesManagerReviewRequestRepository()
  };
}

export async function submitSalesManagerReviewRequest(
  actor: AuthenticatedUser | null,
  value: unknown,
  input: Dependencies = {}
): Promise<SalesManagerReviewRequestCreatedResult> {
  if (!actor) {
    throw new Error("Authentication required.");
  }

  const context = deps(input);
  const normalizedRequest = normalizeSalesManagerReviewRequest(value);
  const command = normalizeEnterpriseCommand({
    actorUserId: actor.id,
    commandType: "CREATE_MANAGER_REVIEW_REQUEST",
    domain: "SALES_CONSOLE",
    expectedVersion: 0,
    idempotencyKey: normalizedRequest.idempotencyKey,
    locationId: null,
    organizationId: context.organizationId,
    payload: {
      assignedManagerUserId: normalizedRequest.assignedManagerUserId,
      customerId: normalizedRequest.customerId,
      dealId: normalizedRequest.dealId,
      sourceSnapshot: normalizedRequest.sourceSnapshot,
      urgency: normalizedRequest.urgency,
      vehicleId: normalizedRequest.vehicleId
    },
    reason: normalizedRequest.reason,
    subjectId: normalizedRequest.idempotencyKey,
    subjectType: "MANAGER_REVIEW_REQUEST"
  });
  const persisted = await context.repository.persist({
    actorUserId: actor.id,
    boardDate: context.boardDate,
    commandType: "CREATE_MANAGER_REVIEW_REQUEST",
    correlationId: command.correlationId,
    idempotencyKey: command.idempotencyKey,
    organizationId: context.organizationId,
    request: normalizedRequest,
    requestHash: command.requestHash
  });

  return {
    auditEventId: persisted.auditEventId,
    commandId: persisted.commandId,
    correlationId: persisted.correlationId,
    duplicate: persisted.duplicate,
    guardrails: salesManagerReviewRequestServiceGuardrails,
    idempotencyKey: persisted.idempotencyKey,
    status: persisted.duplicate ? "duplicate" : "created",
    task: persisted.task,
    workflowLive: true
  };
}

export function salesManagerReviewRequestServiceLimitsWritesToManagerReview() {
  return salesManagerReviewRequestServiceGuardrails.includes("Only audited Manager Review task creation");
}

export async function salesManagerReviewRequestServiceReturnsCreatedOrDuplicateStatus(
  actor: AuthenticatedUser,
  value: unknown,
  input: Dependencies
) {
  const result = await submitSalesManagerReviewRequest(actor, value, input);

  return result.status === "created" || result.status === "duplicate";
}
