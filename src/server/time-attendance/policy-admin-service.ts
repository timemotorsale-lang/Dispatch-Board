import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_MINNEAPOLIS_LOCATION, INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";

import { requireTimeAttendanceCapability } from "./capabilities";
import { getTimePolicyProfileTemplate, TIME_POLICY_SOURCES } from "./policy-registry";
import { createTimeCardProjectionService } from "./projection-service";

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Policy administration payload must be an object.");
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function date(value: unknown, label: string) {
  const raw = text(value);
  const parsed = new Date(raw.length === 10 ? `${raw}T00:00:00.000Z` : raw);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} is invalid.`);
  return parsed;
}

function reason(value: unknown) {
  const result = text(value);
  if (result.length < 15) throw new Error("A governance reason of at least 15 characters is required.");
  return result;
}

async function audit(input: {
  actorUserId: string;
  eventType: string;
  locationId?: string | null;
  reason: string;
  subjectId: string;
  subjectType: string;
  value: unknown;
}) {
  const correlationId = randomUUID();
  await prisma.enterpriseAuditEvent.create({
    data: {
      organizationId: INITIAL_ORGANIZATION.id,
      locationId: input.locationId ?? null,
      actorUserId: input.actorUserId,
      domain: "TIME_ATTENDANCE",
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      eventType: input.eventType,
      reason: input.reason,
      newValue: json(input.value),
      metadata: json({ governedAdministration: true }),
      correlationId
    }
  });
}

async function authorize(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  await requireTimeAttendanceCapability({ actor: user, capability: "TIME_POLICY_ADMIN" });
  return user;
}

export async function getTimeAttendancePolicyAdministration(actor: AuthenticatedUser | null) {
  await authorize(actor);
  const [profiles, assignments, payPeriods, users, rollout] = await Promise.all([
    prisma.timeAttendancePolicyProfile.findMany({
      where: { organizationId: INITIAL_ORGANIZATION.id },
      orderBy: [{ code: "asc" }, { version: "desc" }]
    }),
    prisma.timeAttendancePolicyAssignment.findMany({
      where: { organizationId: INITIAL_ORGANIZATION.id },
      include: { staffUser: { select: { name: true } }, policyProfile: { select: { name: true, version: true } }, approvedByUser: { select: { name: true } } },
      orderBy: { effectiveFrom: "desc" }
    }),
    prisma.timeAttendancePayPeriodDefinition.findMany({
      where: { organizationId: INITIAL_ORGANIZATION.id },
      orderBy: [{ code: "asc" }, { version: "desc" }]
    }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.vehicleOperationsFeatureFlag.findMany({
      where: { organizationId: INITIAL_ORGANIZATION.id, code: { startsWith: "TIME_ATTENDANCE_" } },
      orderBy: { code: "asc" }
    })
  ]);
  return {
    generatedAt: new Date().toISOString(),
    profiles: profiles.map((profile) => ({ ...profile, effectiveFrom: profile.effectiveFrom.toISOString(), effectiveTo: profile.effectiveTo?.toISOString() ?? null })),
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      staffUserId: assignment.staffUserId,
      staffName: assignment.staffUser.name,
      profileName: assignment.policyProfile.name,
      profileVersion: assignment.policyProfile.version,
      effectiveFrom: assignment.effectiveFrom.toISOString(),
      effectiveTo: assignment.effectiveTo?.toISOString() ?? null,
      approvedBy: assignment.approvedByUser.name,
      approvalReason: assignment.approvalReason
    })),
    payPeriods: payPeriods.map((period) => ({ ...period, anchorDate: period.anchorDate.toISOString(), effectiveFrom: period.effectiveFrom.toISOString(), effectiveTo: period.effectiveTo?.toISOString() ?? null })),
    users,
    rollout: rollout.map((flag) => ({ ...flag, allowedUserIds: Array.isArray(flag.allowedUserIds) ? flag.allowedUserIds : [] }))
  };
}

export async function runTimeAttendancePolicyAdministrationCommand(actor: AuthenticatedUser | null, value: unknown) {
  const user = await authorize(actor);
  const raw = object(value);
  const command = text(raw.command).toUpperCase();
  const governanceReason = reason(raw.reason);
  const locationId = text(raw.locationId) || INITIAL_MINNEAPOLIS_LOCATION.id;

  if (command === "CREATE_PROFILE_DRAFT") {
    const templateId = text(raw.templateId);
    const template = getTimePolicyProfileTemplate(templateId);
    if (!template) throw new Error("Approved policy template was not found.");
    const latest = await prisma.timeAttendancePolicyProfile.findFirst({
      where: { organizationId: INITIAL_ORGANIZATION.id, code: template.id },
      orderBy: { version: "desc" },
      select: { version: true }
    });
    const profile = await prisma.timeAttendancePolicyProfile.create({
      data: {
        organizationId: INITIAL_ORGANIZATION.id,
        locationId,
        code: template.id,
        name: text(raw.name) || template.name,
        version: (latest?.version ?? 0) + 1,
        status: "DRAFT",
        effectiveFrom: date(raw.effectiveFrom, "Effective date"),
        jurisdiction: template.jurisdiction,
        timezone: text(raw.timezone) || INITIAL_MINNEAPOLIS_LOCATION.timezone,
        workweekStartDay: "SUNDAY",
        workweekStartMinute: 0,
        payBasis: "HOURLY",
        overtimeCoverage: "US_FLSA_NONEXEMPT",
        roundingPolicy: "EXACT_TIME",
        scheduledMealPolicy: json(template.scheduledMealPolicy),
        breakPolicyVersionIds: json(template.policyVersionIds.filter((id) => id.includes("BREAK"))),
        esstPolicyVersionId: template.policyVersionIds.find((id) => id.includes("ESST")) ?? null,
        payrollMapping: json({ version: text(raw.payrollMappingVersion) || "UNAPPROVED-DRAFT", earningCodes: { regular: "REGULAR", overtime: "OVERTIME", esst: "ESST" } }),
        sourceSnapshot: json({ templateId, sources: TIME_POLICY_SOURCES, createdReason: governanceReason, legalApprovalClaimed: false, payrollApprovalClaimed: false })
      }
    });
    await audit({ actorUserId: user.id, eventType: "TIME_POLICY_DRAFT_CREATED", locationId, reason: governanceReason, subjectId: profile.id, subjectType: "TIME_POLICY_PROFILE", value: { code: profile.code, version: profile.version, status: profile.status } });
    return { profileId: profile.id, status: profile.status, version: profile.version };
  }

  if (command === "ACTIVATE_PROFILE") {
    const profileId = text(raw.profileId);
    const reviewedOn = date(raw.sourceReviewedOn, "Source review date");
    const prior = await prisma.timeAttendancePolicyProfile.findFirst({ where: { id: profileId, organizationId: INITIAL_ORGANIZATION.id } });
    if (!prior) throw new Error("Policy profile was not found.");
    const sourceSnapshot = prior.sourceSnapshot && typeof prior.sourceSnapshot === "object" && !Array.isArray(prior.sourceSnapshot) ? prior.sourceSnapshot : {};
    const profile = await prisma.$transaction(async (tx) => {
      await tx.timeAttendancePolicyProfile.updateMany({
        where: { organizationId: INITIAL_ORGANIZATION.id, locationId: prior.locationId, code: prior.code, status: "ACTIVE", id: { not: prior.id } },
        data: { status: "RETIRED", effectiveTo: prior.effectiveFrom }
      });
      return tx.timeAttendancePolicyProfile.update({
        where: { id: prior.id },
        data: { status: "ACTIVE", sourceSnapshot: json({ ...sourceSnapshot, activatedByUserId: user.id, activatedReason: governanceReason, sourceReviewedOn: reviewedOn.toISOString(), externalLegalApprovalClaimed: false, externalPayrollApprovalClaimed: false }) }
      });
    });
    await audit({ actorUserId: user.id, eventType: "TIME_POLICY_ACTIVATED", locationId: profile.locationId, reason: governanceReason, subjectId: profile.id, subjectType: "TIME_POLICY_PROFILE", value: { status: profile.status, sourceReviewedOn: reviewedOn.toISOString() } });
    return { profileId: profile.id, status: profile.status, version: profile.version };
  }

  if (command === "ASSIGN_PROFILE") {
    const staffUserId = text(raw.staffUserId);
    const policyProfileId = text(raw.profileId);
    const effectiveFrom = date(raw.effectiveFrom, "Assignment effective date");
    const profile = await prisma.timeAttendancePolicyProfile.findFirst({ where: { id: policyProfileId, organizationId: INITIAL_ORGANIZATION.id, status: "ACTIVE" } });
    if (!profile) throw new Error("An active policy profile is required for assignment.");
    const conflict = await prisma.timeAttendancePolicyAssignment.findFirst({
      where: { organizationId: INITIAL_ORGANIZATION.id, staffUserId, effectiveFrom: { lte: effectiveFrom }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }] }
    });
    if (conflict) throw new Error("An overlapping policy assignment already exists. End-date it before creating another assignment.");
    const assignment = await prisma.timeAttendancePolicyAssignment.create({
      data: { organizationId: INITIAL_ORGANIZATION.id, locationId: profile.locationId, staffUserId, policyProfileId, effectiveFrom, approvedByUserId: user.id, approvalReason: governanceReason }
    });
    await audit({ actorUserId: user.id, eventType: "TIME_POLICY_ASSIGNED", locationId: profile.locationId, reason: governanceReason, subjectId: assignment.id, subjectType: "TIME_POLICY_ASSIGNMENT", value: { staffUserId, policyProfileId, effectiveFrom: effectiveFrom.toISOString() } });
    const latestEvent = await prisma.timeAttendanceEvent.findFirst({ where: { organizationId: INITIAL_ORGANIZATION.id, staffUserId }, orderBy: { occurredAt: "desc" } });
    const projection = latestEvent ? await createTimeCardProjectionService().project({ organizationId: INITIAL_ORGANIZATION.id, staffUserId, locationId: latestEvent.locationId, occurredAt: latestEvent.occurredAt, trigger: "POLICY_CHANGE" }) : null;
    return { assignmentId: assignment.id, projection };
  }

  if (command === "CREATE_PAY_PERIOD_DRAFT") {
    const code = text(raw.code).toUpperCase();
    if (!code) throw new Error("Pay-period code is required.");
    const latest = await prisma.timeAttendancePayPeriodDefinition.findFirst({ where: { organizationId: INITIAL_ORGANIZATION.id, locationId, code }, orderBy: { version: "desc" } });
    const period = await prisma.timeAttendancePayPeriodDefinition.create({
      data: {
        organizationId: INITIAL_ORGANIZATION.id,
        locationId,
        code,
        name: text(raw.name) || code,
        version: (latest?.version ?? 0) + 1,
        status: "DRAFT",
        frequency: text(raw.frequency).toUpperCase() || "WEEKLY",
        periodLengthDays: Number(raw.periodLengthDays) || 7,
        anchorDate: date(raw.anchorDate, "Anchor date"),
        timezone: text(raw.timezone) || INITIAL_MINNEAPOLIS_LOCATION.timezone,
        effectiveFrom: date(raw.effectiveFrom, "Effective date"),
        payrollMappingVersion: text(raw.payrollMappingVersion) || "UNAPPROVED-DRAFT",
        sourceSnapshot: json({ createdByUserId: user.id, createdReason: governanceReason, payrollApprovalClaimed: false }),
        createdByUserId: user.id
      }
    });
    await audit({ actorUserId: user.id, eventType: "PAY_PERIOD_DRAFT_CREATED", locationId, reason: governanceReason, subjectId: period.id, subjectType: "TIME_PAY_PERIOD", value: { code, version: period.version } });
    return { payPeriodId: period.id, status: period.status, version: period.version };
  }

  if (command === "ACTIVATE_PAY_PERIOD") {
    const payPeriodId = text(raw.payPeriodId);
    const prior = await prisma.timeAttendancePayPeriodDefinition.findFirst({ where: { id: payPeriodId, organizationId: INITIAL_ORGANIZATION.id } });
    if (!prior) throw new Error("Pay-period definition was not found.");
    const period = await prisma.$transaction(async (tx) => {
      await tx.timeAttendancePayPeriodDefinition.updateMany({ where: { organizationId: INITIAL_ORGANIZATION.id, locationId: prior.locationId, code: prior.code, status: "ACTIVE", id: { not: prior.id } }, data: { status: "RETIRED", effectiveTo: prior.effectiveFrom } });
      return tx.timeAttendancePayPeriodDefinition.update({ where: { id: prior.id }, data: { status: "ACTIVE", sourceSnapshot: json({ activatedByUserId: user.id, activatedReason: governanceReason, prior: prior.sourceSnapshot, externalPayrollApprovalClaimed: false }) } });
    });
    await audit({ actorUserId: user.id, eventType: "PAY_PERIOD_ACTIVATED", locationId: period.locationId, reason: governanceReason, subjectId: period.id, subjectType: "TIME_PAY_PERIOD", value: { status: period.status, version: period.version } });
    return { payPeriodId: period.id, status: period.status, version: period.version };
  }

  if (command === "UPDATE_ROLLOUT" || command === "ROLLBACK_ROLLOUT") {
    const code = text(raw.code).toUpperCase();
    if (!code.startsWith("TIME_ATTENDANCE_")) throw new Error("Time Attendance rollout code is invalid.");
    const requestedMode = command === "ROLLBACK_ROLLOUT" ? "OFF" : text(raw.mode).toUpperCase();
    if (!["OFF", "SHADOW"].includes(requestedMode)) {
      throw new Error("Pilot and general activation remain blocked until external readiness evidence and approvals are supplied. Use SHADOW for review.");
    }
    const existing = await prisma.vehicleOperationsFeatureFlag.findFirst({ where: { organizationId: INITIAL_ORGANIZATION.id, locationId, code } });
    const allowedUserIds = Array.isArray(raw.allowedUserIds) ? raw.allowedUserIds.filter((entry): entry is string => typeof entry === "string") : [];
    const flag = existing
      ? await prisma.vehicleOperationsFeatureFlag.update({ where: { id: existing.id }, data: { mode: requestedMode as "OFF" | "SHADOW", rolloutPercent: 0, allowedUserIds, version: { increment: 1 }, updatedByUserId: user.id } })
      : await prisma.vehicleOperationsFeatureFlag.create({ data: { organizationId: INITIAL_ORGANIZATION.id, locationId, code, mode: requestedMode as "OFF" | "SHADOW", rolloutPercent: 0, allowedUserIds, updatedByUserId: user.id } });
    await prisma.vehicleOperationsRolloutEvent.create({ data: { organizationId: INITIAL_ORGANIZATION.id, actorUserId: user.id, action: command, reason: governanceReason, priorState: json(existing ?? {}), nextState: json(flag), correlationId: randomUUID() } });
    return { code: flag.code, mode: flag.mode, version: flag.version, pilotEligible: false, productionEligible: false };
  }

  throw new Error("Policy administration command is invalid.");
}
