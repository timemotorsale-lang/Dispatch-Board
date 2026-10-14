import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { requireTimeAttendanceCapability } from "./capabilities";
import { recordSafeInternalTimeAttendanceNotification } from "./notification-service";

export type TimeCardManagerDecision = "APPROVE" | "RETURN";

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Card review payload must be an object.");
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function integer(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("Card version must be a nonnegative integer.");
  return parsed;
}

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export function evaluateTimeCardApprovalEligibility(input: {
  actorUserId: string;
  staffUserId: string;
  cardChecksum: string;
  version: number;
  attestations: { cardChecksum: string; statement: string; timeCardVersion: number }[];
  exceptions: { blocking: boolean; status: string }[];
  correctionRequests: { status: string }[];
}) {
  if (input.actorUserId === input.staffUserId) return { eligible: false, reason: "SELF_APPROVAL_FORBIDDEN" } as const;
  const attested = input.attestations.some((entry) =>
    entry.timeCardVersion === input.version && entry.cardChecksum === input.cardChecksum && !entry.statement.toLowerCase().includes("disputes")
  );
  if (!attested) return { eligible: false, reason: "EXACT_ATTESTATION_REQUIRED" } as const;
  if (input.exceptions.some((entry) => entry.blocking && ["OPEN", "ACKNOWLEDGED"].includes(entry.status))) {
    return { eligible: false, reason: "BLOCKING_EXCEPTION" } as const;
  }
  if (input.correctionRequests.some((entry) => ["SUBMITTED", "RETURNED", "APPROVED"].includes(entry.status))) {
    return { eligible: false, reason: "OPEN_CORRECTION" } as const;
  }
  return { eligible: true, reason: "CLEAN_EXACT_VERSION" } as const;
}

export async function decideTimeCard(
  actor: AuthenticatedUser | null,
  value: unknown,
  input: { organizationId?: string } = {}
) {
  const user = assertAuthenticatedUser(actor);
  const raw = object(value);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const decision = text(raw.decision).toUpperCase() as TimeCardManagerDecision;
  const timeCardId = text(raw.timeCardId);
  const timeCardVersion = integer(raw.timeCardVersion);
  const cardChecksum = text(raw.cardChecksum);
  const reason = text(raw.reason);
  if (!timeCardId || !cardChecksum.startsWith("sha256:")) throw new Error("An exact card version and checksum are required.");
  if (!(["APPROVE", "RETURN"] as string[]).includes(decision)) throw new Error("Card review decision is invalid.");
  if (reason.length < 15) throw new Error("Card review reason must be at least 15 characters.");

  const card = await prisma.timeCard.findFirst({
    where: { id: timeCardId, organizationId, version: timeCardVersion },
    include: {
      approvals: true,
      attestations: true,
      correctionRequests: true,
      exceptions: true
    }
  });
  if (!card) throw new Error("The requested card version was not found.");
  await requireTimeAttendanceCapability({
    actor: user,
    capability: "TIME_ATTENDANCE_MANAGER",
    locationId: card.locationId,
    organizationId,
    priorActorUserId: card.staffUserId === user.id ? user.id : null
  });
  if (card.staffUserId === user.id) throw new Error("A manager cannot approve their own time card.");
  if (card.sourceEventChecksum !== cardChecksum) throw new Error("Card checksum is stale. Refresh before recording a decision.");
  if (["LOCKED", "EXPORTED", "VOID"].includes(card.status)) throw new Error(`A ${card.status.toLowerCase()} card cannot be reviewed.`);

  if (decision === "APPROVE") {
    const eligibility = evaluateTimeCardApprovalEligibility({
      actorUserId: user.id,
      staffUserId: card.staffUserId,
      cardChecksum: card.sourceEventChecksum,
      version: card.version,
      attestations: card.attestations,
      exceptions: card.exceptions,
      correctionRequests: card.correctionRequests
    });
    if (!eligibility.eligible) {
      const messages = {
        SELF_APPROVAL_FORBIDDEN: "A manager cannot approve their own time card.",
        EXACT_ATTESTATION_REQUIRED: "Employee attestation for this exact card version is required.",
        BLOCKING_EXCEPTION: "Blocking exceptions must be resolved before approval.",
        OPEN_CORRECTION: "Open correction requests must be resolved before approval."
      };
      throw new Error(messages[eligibility.reason]);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.timeCardApproval.findUnique({
      where: { timeCardId_timeCardVersion_managerUserId: { timeCardId, timeCardVersion, managerUserId: user.id } }
    });
    if (existing) {
      if (existing.decision !== decision || existing.cardChecksum !== cardChecksum || existing.reason !== reason) {
        throw new Error("This manager already recorded a different decision for this card version.");
      }
      return { approval: existing, duplicate: true };
    }
    const changed = await tx.timeCard.updateMany({
      where: { id: timeCardId, version: timeCardVersion, sourceEventChecksum: cardChecksum, status: card.status },
      data: {
        payrollReady: decision === "APPROVE",
        status: decision === "APPROVE" ? "APPROVED" : "EMPLOYEE_REVIEW"
      }
    });
    if (changed.count !== 1) throw new Error("Card changed during review. Refresh and try again.");
    const approval = await tx.timeCardApproval.create({
      data: {
        organizationId,
        timeCardId,
        managerUserId: user.id,
        timeCardVersion,
        approvedAt: new Date(),
        decision,
        reason,
        cardChecksum
      }
    });
    const correlationId = randomUUID();
    await tx.enterpriseAuditEvent.create({
      data: {
        organizationId,
        locationId: card.locationId,
        actorUserId: user.id,
        domain: "TIME_ATTENDANCE",
        subjectType: "TimeCard",
        subjectId: card.id,
        eventType: `TIME_CARD_${decision}`,
        priorValue: json({ status: card.status, payrollReady: card.payrollReady, version: card.version }),
        newValue: json({ status: decision === "APPROVE" ? "APPROVED" : "EMPLOYEE_REVIEW", payrollReady: decision === "APPROVE", version: card.version }),
        reason,
        metadata: json({ cardChecksum, exactVersionBinding: true, separationOfDutiesChecked: true }),
        correlationId
      }
    });
    return { approval, duplicate: false };
  });

  await recordSafeInternalTimeAttendanceNotification({
    organizationId,
    locationId: card.locationId,
    recipientUserId: card.staffUserId,
    notificationType: "MANAGER_APPROVAL_REQUIRED",
    severity: decision === "RETURN" ? "WARNING" : "INFO",
    title: decision === "APPROVE" ? "Time card approved" : "Time card returned for review",
    body: decision === "APPROVE" ? `Card version ${timeCardVersion} is approved for payroll review.` : reason,
    sourceType: "TimeCard",
    sourceId: card.id,
    payload: { decision, timeCardVersion, externalDeliveryClaimed: false }
  });
  return { ...result, card: { id: card.id, status: decision === "APPROVE" ? "APPROVED" : "EMPLOYEE_REVIEW", version: card.version } };
}

export async function bulkApproveCleanTimeCards(actor: AuthenticatedUser | null, value: unknown) {
  const user = assertAuthenticatedUser(actor);
  const raw = object(value);
  const ids = Array.isArray(raw.timeCardIds) ? raw.timeCardIds.filter((id): id is string => typeof id === "string") : [];
  const reason = text(raw.reason);
  if (!ids.length) throw new Error("Select at least one clean card.");
  if (ids.length > 50) throw new Error("Bulk approval is limited to 50 clean cards at a time.");
  const cards = await prisma.timeCard.findMany({ where: { id: { in: ids }, organizationId: INITIAL_ORGANIZATION.id } });
  const results = [];
  for (const card of cards) {
    results.push(await decideTimeCard(user, {
      decision: "APPROVE",
      timeCardId: card.id,
      timeCardVersion: card.version,
      cardChecksum: card.sourceEventChecksum,
      reason
    }));
  }
  return { approved: results.filter((entry) => entry.card.status === "APPROVED").length, results };
}
