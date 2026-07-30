import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { buildSalesRecordWorkflowState } from "@/features/sales/sales-console-m68-record-sale-ui-workflow";

import {
  createCompletedSaleRecordRepository,
  type CompletedSaleRecordPersistResult
} from "./completed-sale-record-repository";
import { normalizeCompletedSaleRecordRequest } from "./completed-sale-record-validation";

export type CompletedSaleRecordCreatedResult = {
  auditEventId: string | null;
  commandId: string;
  correlationId: string;
  duplicate: boolean;
  guardrails: readonly string[];
  idempotencyKey: string;
  saleRecord: CompletedSaleRecordPersistResult["saleRecord"];
  status: "created" | "duplicate";
  workflowLive: true;
};

export const completedSaleRecordServiceGuardrails = [
  "Only Sales Console-owned completed-sale records",
  "No CRM/DMS/inventory/source-system mutation",
  "No customer messaging",
  "No quote submission",
  "No vehicle hold or reservation",
  "No finance decision",
  "No discount approval",
  "No contract execution"
] as const;

type Dependencies = {
  now?: () => Date;
  organizationId?: string;
  repository?: ReturnType<typeof createCompletedSaleRecordRepository>;
};

function deps(input: Dependencies = {}) {
  return {
    now: input.now ?? (() => new Date()),
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    repository: input.repository ?? createCompletedSaleRecordRepository()
  };
}

function actorRole(actor: AuthenticatedUser) {
  if (actor.roles.includes("Admin")) return "Admin / Owner";
  if (actor.roles.includes("Owner")) return "Admin / Owner";
  if (actor.roles.includes("Sales Manager")) return "Sales Manager";
  if (actor.roles.includes("Salesperson")) return "Salesperson";
  if (actor.roles.includes("BDC") || actor.roles.includes("Lead Coordinator")) return "BDC / Lead Coordinator";
  return "BDC / Lead Coordinator";
}

export async function submitCompletedSaleRecord(
  actor: AuthenticatedUser | null,
  value: unknown,
  input: Dependencies = {}
): Promise<CompletedSaleRecordCreatedResult> {
  if (!actor) {
    throw new Error("Authentication required.");
  }

  const context = deps(input);
  const normalizedRequest = normalizeCompletedSaleRecordRequest(value);
  const role = actorRole(actor);
  const workflowState = buildSalesRecordWorkflowState(
    {
      blockerSeverity: "none",
      customerId: normalizedRequest.customerId,
      customerName: normalizedRequest.customerName,
      evidenceIds: normalizedRequest.evidenceIds,
      grossEstimateCents: normalizedRequest.grossEstimateCents,
      managerId: normalizedRequest.managerId,
      managerReviewResolved: true,
      paymentPath: normalizedRequest.paymentPath,
      productLabel: normalizedRequest.productLabel,
      revenueLane: normalizedRequest.revenueLane,
      revenueOpportunityId: normalizedRequest.revenueOpportunityId,
      saleDate: normalizedRequest.saleDate,
      salesOpportunityId: normalizedRequest.salesOpportunityId,
      salespersonId: normalizedRequest.salespersonId,
      satisfied: normalizedRequest.satisfied,
      sourceRecordLinks: normalizedRequest.sourceRecordLinks,
      vehicleStockNumber: normalizedRequest.vehicleStockNumber
    },
    role
  );

  if (!workflowState.submitEnabled) {
    throw new Error(workflowState.reason);
  }

  const command = normalizeEnterpriseCommand({
    actorUserId: actor.id,
    commandType: "RECORD_COMPLETED_SALE",
    domain: "SALES_CONSOLE",
    expectedVersion: 0,
    idempotencyKey: normalizedRequest.idempotencyKey,
    locationId: null,
    organizationId: context.organizationId,
    payload: {
      completedSaleRecord: normalizedRequest,
      sourceSystemsMutated: false
    },
    reason: normalizedRequest.reason,
    subjectId: normalizedRequest.salesOpportunityId,
    subjectType: "COMPLETED_SALE_RECORD"
  });
  const persisted = await context.repository.persist({
    actorUserId: actor.id,
    commandType: "RECORD_COMPLETED_SALE",
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
    guardrails: completedSaleRecordServiceGuardrails,
    idempotencyKey: persisted.idempotencyKey,
    saleRecord: persisted.saleRecord,
    status: persisted.duplicate ? "duplicate" : "created",
    workflowLive: true
  };
}

export function completedSaleRecordServiceBlocksSourceSystemWrites() {
  return completedSaleRecordServiceGuardrails.includes("No CRM/DMS/inventory/source-system mutation");
}
