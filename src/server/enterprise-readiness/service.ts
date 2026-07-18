import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser, isGeneralManager, isManager } from "@/server/policies/access";
import { assertActivationAuthority, evaluateExpansionReadiness, evaluatePrePilotReadiness, READINESS_GATES, SIGNOFF_DIMENSIONS, validateGateCode, validatePilotScope } from "./domain";
import { createEnterpriseReadinessRepository } from "./repository";

type Dependencies = { database?: typeof prisma; organizationId?: string; activationAuthorized?: boolean; activationAuthority?: string };
const object = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const required = (value: unknown, label: string, minimum = 1) => { const result = String(value ?? "").trim(); if (result.length < minimum) throw new Error(`${label} is required${minimum > 1 ? ` and must contain at least ${minimum} characters` : ""}.`); return result; };
const array = (value: unknown) => Array.isArray(value) ? value : [];

function authorize(actor: AuthenticatedUser | null, generalManager = false) {
  const user = assertAuthenticatedUser(actor);
  if (generalManager ? !isGeneralManager(user) : !isManager(user)) throw new Error(generalManager ? "Pilot authorization requires General Manager authority." : "Enterprise readiness access requires manager privileges.");
  return user;
}

function context(input: Dependencies) {
  const database = input.database ?? prisma;
  return { database, repository: createEnterpriseReadinessRepository(database), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, activationAuthorized: input.activationAuthorized ?? process.env.INVENTORY_CONSOLE_PILOT_ACTIVATION_ENABLED === "true", activationAuthority: input.activationAuthority ?? process.env.INVENTORY_CONSOLE_PILOT_ACTIVATION_AUTHORITY ?? "" };
}

async function assertNamedCapability(ctx: ReturnType<typeof context>, userId: string, capability: string) {
  const now = new Date(), grants = await ctx.database.vehicleCapabilityGrant.findMany({ where: { organizationId: ctx.organizationId, userId, capability, locationId: null, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] }, select: { effect: true } });
  if (!grants.some((grant) => grant.effect === "ALLOW") || grants.some((grant) => grant.effect === "DENY")) throw new Error(`Named capability ${capability} is required.`);
}

function assertPilotControlPlan(pilot: { supportOwnerUserId: string | null; thresholdSnapshot: unknown; pauseCriteriaSnapshot: unknown; rollbackPlanSnapshot: unknown }) {
  const missing = [["support owner", Boolean(pilot.supportOwnerUserId)], ["operating thresholds", Object.keys(object(pilot.thresholdSnapshot)).length > 0], ["pause criteria", Object.keys(object(pilot.pauseCriteriaSnapshot)).length > 0], ["rollback plan", Object.keys(object(pilot.rollbackPlanSnapshot)).length > 0]].filter(([, present]) => !present).map(([name]) => name);
  if (missing.length) throw new Error(`Pilot authorization is blocked until these controls are named: ${missing.join(", ")}.`);
}

function command(user: AuthenticatedUser, organizationId: string, pilotId: string, action: string, expectedVersion: number, idempotencyKey: string, reason: string, payload: Record<string, unknown>) {
  return normalizeEnterpriseCommand({ actorUserId: user.id, commandType: action, domain: "ENTERPRISE_READINESS", expectedVersion, idempotencyKey, locationId: null, organizationId, payload, reason, subjectId: pilotId, subjectType: "INVENTORY_CONSOLE_PILOT" });
}

export async function getEnterpriseReadinessConsole(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  authorize(actor); const ctx = context(input), pilots = await ctx.repository.list(ctx.organizationId);
  return {
    contractVersion: "inventory-console-readiness/r12.0.0", generatedAt: new Date().toISOString(),
    activation: { enabled: ctx.activationAuthorized && Boolean(ctx.activationAuthority), posture: ctx.activationAuthorized && ctx.activationAuthority ? "CONTROLLED_AUTHORITY_CONFIGURED" : "BLOCKED_PENDING_NAMED_AUTHORITY", authority: ctx.activationAuthority || null },
    gates: READINESS_GATES,
    pilots: pilots.map((pilot) => ({ ...pilot, prePilot: evaluatePrePilotReadiness(pilot.evidence), expansion: evaluateExpansionReadiness(pilot.evidence, pilot.signoffs) })),
    signoffDimensions: SIGNOFF_DIMENSIONS
  };
}

export async function executeEnterpriseReadinessCommand(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const data = object(value), action = required(data.action, "Action").toUpperCase(), user = authorize(actor, ["AUTHORIZE_PILOT", "ACTIVATE_PILOT", "RECORD_SIGNOFF"].includes(action)), ctx = context(input);
  const expectedVersion = Number(data.expectedVersion ?? 0); if (!Number.isInteger(expectedVersion) || expectedVersion < 0) throw new Error("Expected version must be a non-negative integer.");
  const idempotencyKey = required(data.idempotencyKey, "Idempotency key");
  const reason = required(data.reason, "Reason", 10);
  const pilotId = action === "CREATE_PILOT_DRAFT" ? randomUUID() : required(data.pilotId, "Pilot id");
  const make = (payload: Record<string, unknown>) => command(user, ctx.organizationId, pilotId, action, expectedVersion, idempotencyKey, reason, payload);

  if (action === "CREATE_PILOT_DRAFT") {
    const scope = validatePilotScope(data.scope), code = required(data.code, "Pilot code").toUpperCase(), name = required(data.name, "Pilot name");
    return ctx.repository.create(make({ code, name, scope }), { code, name, ownerUserId: user.id, supportOwnerUserId: data.supportOwnerUserId ? String(data.supportOwnerUserId) : null, scope, thresholds: object(data.thresholds), pauseCriteria: object(data.pauseCriteria), rollbackPlan: object(data.rollbackPlan), baseline: object(data.baseline) });
  }
  const pilot = await ctx.repository.get(ctx.organizationId, pilotId); if (!pilot) throw new Error("Inventory Console pilot was not found.");
  if (pilot.version !== expectedVersion) throw new Error(`Expected version ${expectedVersion}, but pilot version is ${pilot.version}.`);

  if (["SAVE_EVIDENCE", "SUBMIT_EVIDENCE"].includes(action)) {
    const gateCode = validateGateCode(required(data.gateCode, "Gate code")), summary = required(data.summary, "Evidence summary", 10), status = action === "SUBMIT_EVIDENCE" ? "SUBMITTED" as const : "IN_PROGRESS" as const;
    const gateNumber = Number(gateCode.slice(3));
    if (gateNumber <= 125 && !["DRAFT", "EVIDENCE_IN_PROGRESS"].includes(pilot.status)) throw new Error("Pre-pilot evidence is frozen once authorization review begins.");
    if (gateNumber >= 126 && gateNumber <= 128 && !["ACTIVE", "PAUSED", "ROLLED_BACK", "COMPLETED"].includes(pilot.status)) throw new Error("Pilot and outcome evidence requires an activated, paused, rolled-back, or completed pilot.");
    if (gateNumber === 129 && !["ROLLED_BACK", "COMPLETED"].includes(pilot.status)) throw new Error("Expansion decision evidence requires a completed or rolled-back pilot.");
    const expiresAt = data.expiresAt ? new Date(String(data.expiresAt)) : null; if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new Error("Evidence expiration must be a valid date.");
    return ctx.repository.writeEvidence(make({ gateCode, status }), { gateCode, status, summary, evidenceReferences: array(data.evidenceReferences), measurements: object(data.measurements), submittedByUserId: user.id, expiresAt });
  }
  if (action === "REVIEW_EVIDENCE") {
    const gateCode = validateGateCode(required(data.gateCode, "Gate code")), status = required(data.decision, "Review decision").toUpperCase();
    if (!(["PASSED", "FAILED", "WAIVED"].includes(status))) throw new Error("Evidence review must pass, fail, or waive the submission.");
    return ctx.repository.reviewEvidence(make({ gateCode, status }), { gateCode, status: status as "PASSED" | "FAILED" | "WAIVED", reviewerUserId: user.id, waiverAuthority: data.waiverAuthority ? String(data.waiverAuthority) : null, waiverReason: data.waiverReason ? String(data.waiverReason) : null });
  }
  if (action === "REQUEST_PILOT_AUTHORIZATION") {
    assertPilotControlPlan(pilot);
    const readiness = evaluatePrePilotReadiness(pilot.evidence); if (!readiness.ready) throw new Error(`Pilot authorization is blocked: ${readiness.blockers.join(" ")}`);
    if (!["DRAFT", "EVIDENCE_IN_PROGRESS"].includes(pilot.status)) throw new Error("Only a draft pilot can request authorization.");
    return ctx.repository.transition(make({ readiness }), "READY_FOR_AUTHORIZATION", user.id, reason);
  }
  if (action === "AUTHORIZE_PILOT") {
    await assertNamedCapability(ctx, user.id, "INVENTORY_R12_PILOT_AUTHORIZE");
    assertPilotControlPlan(pilot);
    if (pilot.status !== "READY_FOR_AUTHORIZATION") throw new Error("Pilot must be ready for authorization.");
    if (pilot.ownerUserId === user.id) throw new Error("Pilot authorization requires a different person from the pilot owner.");
    const readiness = evaluatePrePilotReadiness(pilot.evidence); if (!readiness.ready) throw new Error(`Pilot authorization is blocked: ${readiness.blockers.join(" ")}`);
    return ctx.repository.transition(make({ authority: user.id }), "AUTHORIZED", user.id, reason);
  }
  if (action === "ACTIVATE_PILOT") {
    await assertNamedCapability(ctx, user.id, "INVENTORY_R12_PILOT_ACTIVATE");
    if (pilot.status !== "AUTHORIZED") throw new Error("Pilot must be authorized before activation.");
    assertActivationAuthority(ctx.activationAuthorized && Boolean(ctx.activationAuthority));
    return ctx.repository.transition(make({ authority: ctx.activationAuthority }), "ACTIVE", user.id, reason);
  }
  if (action === "PAUSE_PILOT") { if (pilot.status !== "ACTIVE") throw new Error("Only an active pilot can be paused."); return ctx.repository.transition(make({}), "PAUSED", user.id, reason); }
  if (action === "ROLLBACK_PILOT") { if (!(["ACTIVE", "PAUSED"].includes(pilot.status))) throw new Error("Only an active or paused pilot can be rolled back."); return ctx.repository.transition(make({}), "ROLLED_BACK", user.id, reason); }
  if (action === "RESUME_PILOT") {
    if (pilot.status !== "PAUSED") throw new Error("Only a paused pilot can be resumed.");
    const rollbackEvidence = pilot.evidence.find((item) => item.gateCode === "IC-127");
    if (!rollbackEvidence || !["PASSED", "WAIVED"].includes(rollbackEvidence.status)) throw new Error("Pilot resume requires approved IC-127 pause and rollback evidence.");
    assertActivationAuthority(ctx.activationAuthorized && Boolean(ctx.activationAuthority));
    return ctx.repository.transition(make({ authority: ctx.activationAuthority }), "ACTIVE", user.id, reason);
  }
  if (action === "RECORD_OUTCOMES") {
    if (!(["ACTIVE", "PAUSED", "ROLLED_BACK"].includes(pilot.status))) throw new Error("Outcomes require an activated, paused, or rolled-back pilot.");
    const outcomes = object(data.outcomes); if (!Object.keys(outcomes).length) throw new Error("Outcome measurements are required.");
    return ctx.repository.recordOutcomes(make({ outcomes }), outcomes);
  }
  if (action === "COMPLETE_PILOT") {
    if (!(["ACTIVE", "PAUSED"].includes(pilot.status))) throw new Error("Only an active or paused pilot can be completed.");
    const requiredGates = ["IC-126", "IC-127", "IC-128"], incomplete = requiredGates.filter((code) => !pilot.evidence.some((item) => item.gateCode === code && ["PASSED", "WAIVED"].includes(item.status)));
    if (incomplete.length) throw new Error(`Pilot completion requires approved evidence for ${incomplete.join(", ")}.`);
    if (!Object.keys(object(pilot.outcomeSnapshot)).length) throw new Error("Pilot completion requires recorded outcome measurements.");
    return ctx.repository.transition(make({}), "COMPLETED", user.id, reason);
  }
  if (action === "RECORD_SIGNOFF") {
    const dimension = required(data.dimension, "Sign-off dimension").toUpperCase(), decision = required(data.decision, "Sign-off decision").toUpperCase();
    if (!(SIGNOFF_DIMENSIONS as readonly string[]).includes(dimension)) throw new Error("Sign-off dimension is not part of the approved R12 contract.");
    if (!(["APPROVE", "REJECT"].includes(decision))) throw new Error("Sign-off decision must approve or reject.");
    if (!(["COMPLETED", "ROLLED_BACK"].includes(pilot.status))) throw new Error("Expansion sign-off requires a completed or rolled-back pilot.");
    await assertNamedCapability(ctx, user.id, `INVENTORY_R12_SIGNOFF_${dimension}`);
    return ctx.repository.writeSignoff(make({ dimension, decision }), { dimension, decision: decision as "APPROVE" | "REJECT", signerUserId: user.id, reason, evidenceRefs: array(data.evidenceReferences) });
  }
  throw new Error("Unsupported enterprise-readiness action.");
}
