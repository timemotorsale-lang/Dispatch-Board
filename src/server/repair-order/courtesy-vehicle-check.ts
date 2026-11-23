import type { Prisma } from "@prisma/client";
import { courtesyCheckSubjectType as subjectType, courtesyCheckCommandType as commandType, courtesyOutcomes, frontlineQcItems, type CourtesyCheck, type CourtesyFinding, type CourtesyOutcome } from "@/lib/courtesy-vehicle-check";
import { hasCurrentRepairQcPass } from "@/lib/final-repair-qc";
import { pendingApprovedLabor } from "@/lib/repair-workflow-review";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation } from "@/server/enterprise-command/aggregate-mutation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { getRepairOrderDetail } from "./service";

const domain = "SHOP_OPERATIONS";
const itemCodes = new Set(frontlineQcItems.map(item => item.code));

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function textField(value: unknown, max: number) {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.trim().length > max) throw new Error("An inspection note or evidence reference is too long.");
  return value.trim();
}

export function normalizeCourtesyCheckCommand(raw: unknown) {
  if (!isRecord(raw) || typeof raw.expectedVersion !== "number" || !Number.isSafeInteger(raw.expectedVersion) || raw.expectedVersion < 0 ||
    typeof raw.idempotencyKey !== "string" || !raw.idempotencyKey.trim() || raw.idempotencyKey.length > 120) {
    throw new Error("A current courtesy-check version and request identifier are required.");
  }
  const request = { expectedVersion: raw.expectedVersion, idempotencyKey: raw.idempotencyKey };
  if (raw.action === "RECORD_FOLLOW_UP") {
    if (typeof raw.code !== "string" || !itemCodes.has(raw.code) || typeof raw.outcome !== "string" || !Object.hasOwn(courtesyOutcomes, raw.outcome)) {
      throw new Error("Choose a saved finding and a follow-up outcome.");
    }
    return { ...request, action: "RECORD_FOLLOW_UP" as const, code: raw.code, outcome: raw.outcome as CourtesyOutcome, note: textField(raw.note, 500) };
  }
  if (raw.action === "WITHDRAW_INSPECTION") return { ...request, action: "WITHDRAW_INSPECTION" as const };
  if (raw.action !== "SAVE_INSPECTION" || !Array.isArray(raw.findings) || !raw.findings.length || raw.findings.length > itemCodes.size) {
    throw new Error("Record at least one inspected item.");
  }
  const seen = new Set<string>();
  const findings: CourtesyFinding[] = raw.findings.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.code !== "string" || !itemCodes.has(entry.code) || seen.has(entry.code) ||
      (entry.result !== "PASS" && entry.result !== "REVIEW" && entry.result !== "FAIL")) {
      throw new Error("Choose one valid result per checklist item.");
    }
    seen.add(entry.code);
    const note = textField(entry.note, 700);
    if (entry.result !== "PASS" && !note) throw new Error("Describe every yellow or red finding and its recommended next step.");
    return { code: entry.code, result: entry.result, note, evidence: textField(entry.evidence, 500) };
  });
  return { ...request, action: "SAVE_INSPECTION" as const, findings };
}

async function savedCheck(database: Prisma.TransactionClient, order: { id: string; organizationId: string }) {
  const receipt = await database.enterpriseCommandLedger.findFirst({
    where: { organizationId: order.organizationId, domain, subjectType, subjectId: order.id, commandType, status: "SUCCEEDED" },
    orderBy: { resultingVersion: "desc" }, select: { resultSnapshot: true },
  });
  const result = receipt?.resultSnapshot;
  if (!isRecord(result) || typeof result.version !== "number" || !Number.isSafeInteger(result.version) ||
    typeof result.inspectedAt !== "string" || !Number.isFinite(Date.parse(result.inspectedAt)) ||
    typeof result.inspectorName !== "string" || !Array.isArray(result.findings) || result.findings.length > itemCodes.size) return null;
  if (result.findings.some(item => !isRecord(item) || typeof item.code !== "string" || !itemCodes.has(item.code) ||
    (item.result !== "PASS" && item.result !== "REVIEW" && item.result !== "FAIL") ||
    typeof item.note !== "string" || typeof item.evidence !== "string" ||
    (item.followUp !== undefined && (!isRecord(item.followUp) || typeof item.followUp.outcome !== "string" || !Object.hasOwn(courtesyOutcomes, item.followUp.outcome) ||
      typeof item.followUp.actorName !== "string" || typeof item.followUp.note !== "string" || typeof item.followUp.recordedAt !== "string")))) return null;
  return result as CourtesyCheck;
}

async function context(actor: AuthenticatedUser | null, id: string) {
  const user = assertAuthenticatedUser(actor);
  const order = await getRepairOrderDetail(user, id);
  if (order.origin !== "CUSTOMER_REPAIR" || !order.customerId) throw new Error("Customer repair order was not found.");
  const foundation = createEnterpriseCommandRepository();
  const { organizationId } = order;
  const [grants, flags] = await Promise.all([
    foundation.listCapabilityGrants(user.id, organizationId), foundation.listFeatureFlags(organizationId),
  ]);
  const canManage = evaluateVehicleCapability({ actor: user, capability: "REPAIR_ORDER_MANAGE", locationId: order.locationId, grants }).allowed &&
    evaluateVehicleOperationsFeature(flags, domain, user.id, order.locationId).executable;
  return { user, order, canManage };
}

export async function getCourtesyCheck(actor: AuthenticatedUser | null, id: string) {
  const { order, canManage } = await context(actor, id);
  return { check: await savedCheck(prisma, order), canManage: canManage && order.stage !== "CANCELLED", canInspect: canManage && !order.closedAt && order.stage !== "CANCELLED", order };
}

export async function saveCourtesyCheck(actor: AuthenticatedUser | null, id: string, raw: unknown) {
  const { user, order, canManage } = await context(actor, id);
  if (!canManage) throw new Error("Courtesy check changes require repair-order management access and active Shop Operations at this location.");
  const request = normalizeCourtesyCheckCommand(raw);
  const command = normalizeEnterpriseCommand({
    subjectType, domain, commandType, subjectId: id, organizationId: order.organizationId, locationId: order.locationId,
    actorUserId: user.id, expectedVersion: request.expectedVersion, idempotencyKey: request.idempotencyKey,
    reason: request.action === "WITHDRAW_INSPECTION" ? "Withdraw the recorded courtesy vehicle check."
      : request.action === "SAVE_INSPECTION" ? "Record the customer courtesy vehicle check." : "Record customer follow-up on a courtesy finding.",
    payload: request,
  });
  return executeAggregateMutation(prisma, command, "vehicle-operations.shop", async (tx, version) => {
    const active = await tx.repairOrder.findFirst({
      where: { id, organizationId: order.organizationId, locationId: order.locationId, origin: "CUSTOMER_REPAIR", customerId: { not: null } },
      select: { stage: true, closedAt: true, releaseAuthorization: { select: { id: true } },
        estimateVersions: { orderBy: { version: "desc" }, take: 1, select: {
          lineItems: true, authorizations: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1,
            select: { id: true, disposition: true, authorizedLineKeys: true } },
        } },
        repairJobs: { where: { status: { not: "CANCELLED" } }, select: {
          status: true, authorizationId: true, authorizedLineKey: true,
          laborClocks: { select: { state: true, finishedAt: true } },
          qualityInspections: { orderBy: { version: "desc" }, take: 1, select: {
            disposition: true, inspectedAt: true, safetyChecksPassed: true, peerVerificationRequired: true,
            peerVerificationPassed: true, roadTestRequired: true, roadTestOutcome: true,
          } },
        } } },
    });
    if (!active || active.stage === "CANCELLED") throw new Error("Customer repair order was not found.");
    const previous = await savedCheck(tx, order);
    const stamp = new Date().toISOString();
    if (request.action === "RECORD_FOLLOW_UP") {
      if (!previous?.findings.some(item => item.code === request.code && item.result !== "PASS")) {
        throw new Error("Save an observed review or failure before recording follow-up.");
      }
      const followUp = { outcome: request.outcome, note: request.note, actorName: user.name, recordedAt: stamp };
      return { previous, result: { ...previous, version, findings: previous.findings.map(item => item.code === request.code ? { ...item, followUp } : item) } };
    }
    if (request.action === "WITHDRAW_INSPECTION") {
      if (!previous?.findings.length) throw new Error("There is no saved courtesy check to withdraw.");
      return { previous, result: { ...previous, version, findings: [] } };
    }
    const allJobsPassed = active.repairJobs.length > 0 && active.repairJobs.every(job => hasCurrentRepairQcPass(job) &&
      !job.laborClocks.some(clock => clock.state === "RUNNING" || clock.state === "PAUSED"));
    const waitingForJobs = pendingApprovedLabor(active.estimateVersions[0], active.repairJobs).length > 0;
    const vendorOnlyReleased = active.releaseAuthorization && active.repairJobs.length === 0;
    if (active.closedAt || waitingForJobs || (!vendorOnlyReleased && !allJobsPassed)) {
      throw new Error("Save the courtesy check on an open repair after Final Repair QC has passed.");
    }
    const findings = request.findings.map(item => {
      const before = previous?.findings.find(old => old.code === item.code && old.result === item.result && old.note === item.note && old.evidence === item.evidence);
      return before?.followUp ? { ...item, followUp: before.followUp } : item;
    });
    return { previous, result: { version, findings, inspectedAt: stamp, inspectorName: user.name } satisfies CourtesyCheck };
  });
}
