import { createHash, randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand, type EnterpriseCommandInput } from "./domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository, type VehicleFeatureFlagRecord } from "./repository";
import { assertVehicleCapability, type VehicleCapability } from "./vehicle-capabilities";

type Dependencies = { now?: () => Date; organizationId?: string; repository?: EnterpriseCommandRepository };
function dependencies(input: Dependencies) { return { now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createEnterpriseCommandRepository() }; }
function users(value: unknown) { return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))] : []; }

async function authorize(actor: AuthenticatedUser | null, capability: VehicleCapability, locationId: string | null, deps: ReturnType<typeof dependencies>, context: { amountCents?: number | null; resourceOwnerUserId?: string | null } = {}) {
  const user = assertAuthenticatedUser(actor);
  const grants = await deps.repository.listCapabilityGrants(user.id, deps.organizationId);
  assertVehicleCapability({ actor: user, capability, grants, locationId, now: deps.now(), ...context });
  return user;
}

export async function executeEnterpriseVehicleCommand(actor: AuthenticatedUser | null, value: Omit<EnterpriseCommandInput, "actorUserId" | "organizationId">, input: Dependencies = {}) {
  const deps = dependencies(input);
  const payload = value.payload && typeof value.payload === "object" && !Array.isArray(value.payload) ? value.payload as Record<string, unknown> : {};
  const user = await authorize(actor, "VEHICLE_COMMAND_EXECUTE", value.locationId, deps, {
    amountCents: typeof payload.amountCents === "number" ? payload.amountCents : null,
    resourceOwnerUserId: typeof payload.ownerUserId === "string" ? payload.ownerUserId : null
  });
  const command = normalizeEnterpriseCommand({ ...value, actorUserId: user.id, organizationId: deps.organizationId });
  const result = await deps.repository.commit(command);
  return { commandId: result.command.id, correlationId: result.command.correlationId, duplicate: result.duplicate, version: result.version, result: result.command.resultSnapshot };
}

export const VEHICLE_OPERATIONS_FEATURES = ["VEHICLE_OPERATIONS_MASTER", "ENTERPRISE_COMMANDS", "VEHICLE_REGISTRY", "INVENTORY_INTAKE", "RETAIL_INVENTORY", "SHOP_OPERATIONS", "PARTS_OPERATIONS", "VEHICLE_360", "VEHICLE_DISCOVERY", "CUSTOMER_LIFECYCLE"] as const;
export type VehicleOperationsFeatureCode = (typeof VEHICLE_OPERATIONS_FEATURES)[number];

export const DIAGNOSTICS_FEATURES = ["DIAGNOSTICS_MASTER", "DIAGNOSTIC_CASES", "DIAGNOSTIC_EVIDENCE", "DIAGNOSTIC_REASONING", "DIAGNOSTIC_PUBLISHING", "DIAGNOSTIC_KNOWLEDGE", "DIAGNOSTIC_AI"] as const;
export type DiagnosticsFeatureCode = (typeof DIAGNOSTICS_FEATURES)[number];
const ENTERPRISE_FEATURES = [...VEHICLE_OPERATIONS_FEATURES, ...DIAGNOSTICS_FEATURES] as const;

function evaluateRolloutFeature(flags: VehicleFeatureFlagRecord[], masterCode: string, code: string, userId: string, locationId: string | null) {
  const applicable = (candidate: VehicleFeatureFlagRecord) => candidate.code === code && (candidate.locationId === locationId || candidate.locationId === null);
  const flag = flags.filter(applicable).sort((a, b) => Number(Boolean(b.locationId)) - Number(Boolean(a.locationId)))[0];
  const master = flags.filter((candidate) => candidate.code === masterCode && (candidate.locationId === locationId || candidate.locationId === null)).sort((a, b) => Number(Boolean(b.locationId)) - Number(Boolean(a.locationId)))[0];
  const targetAt = flag?.targetAt?.toISOString() ?? null;
  if (code !== masterCode && (!master || master.mode === "OFF")) return { enabled: false, executable: false, reason: "MASTER_DISABLED", targetAt } as const;
  if (!flag || flag.mode === "OFF") return { enabled: false, executable: false, reason: "FEATURE_DISABLED", targetAt } as const;
  if (flag.mode === "SHADOW") return { enabled: true, executable: false, reason: "SHADOW_ONLY", targetAt } as const;
  if (flag.mode === "GENERAL") return { enabled: true, executable: true, reason: "GENERAL_RELEASE", targetAt } as const;
  const cohort = users(flag.allowedUserIds);
  const bucket = createHash("sha256").update(`${flag.code}:${userId}`).digest()[0] % 100;
  const executable = cohort.includes(userId) || bucket < flag.rolloutPercent;
  return { enabled: true, executable, reason: executable ? "PILOT_ELIGIBLE" : "OUTSIDE_PILOT", targetAt } as const;
}

export function evaluateVehicleOperationsFeature(flags: VehicleFeatureFlagRecord[], code: VehicleOperationsFeatureCode, userId: string, locationId: string | null) {
  return evaluateRolloutFeature(flags, "VEHICLE_OPERATIONS_MASTER", code, userId, locationId);
}

export function describeVehicleOperationsBlock(reason: string) {
  if (reason === "MASTER_DISABLED") return "Vehicle operations are paused or not configured. Ask a rollout administrator to enable the vehicle operations master setting in Settings > Vehicle Operations.";
  if (reason === "FEATURE_DISABLED") return "This workflow is paused or not configured in Settings > Vehicle Operations.";
  if (reason === "OUTSIDE_PILOT") return "Your account is outside this workflow's pilot. Ask a rollout administrator to add you to the pilot.";
  if (reason === "SHADOW_ONLY") return "This workflow is in preview mode; saving is not enabled yet.";
  return "Ask a rollout administrator to review this workflow's rollout settings.";
}

export function evaluateDiagnosticsFeature(flags: VehicleFeatureFlagRecord[], code: DiagnosticsFeatureCode, userId: string, locationId: string | null) {
  return evaluateRolloutFeature(flags, "DIAGNOSTICS_MASTER", code, userId, locationId);
}

export async function getVehicleOperationsFoundation(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const deps = dependencies(input);
  await authorize(actor, "VEHICLE_HEALTH_VIEW", null, deps);
  const [flags, health] = await Promise.all([deps.repository.listFeatureFlags(deps.organizationId), deps.repository.readHealth(deps.organizationId, deps.now())]);
  const oldestAgeSeconds = health.oldestPendingAt ? Math.max(0, Math.round((deps.now().getTime() - health.oldestPendingAt.getTime()) / 1000)) : 0;
  const state = health.deadLetters > 0 || health.projectionFailures > 0 ? "CRITICAL" : oldestAgeSeconds > 60 || health.maxProjectionLagSeconds > 60 ? "DEGRADED" : "HEALTHY";
  for (const code of ENTERPRISE_FEATURES) {
    if (!flags.some(flag => flag.code === code && flag.locationId === null)) flags.push({ id: `unconfigured:${code}`, organizationId: deps.organizationId, locationId: null, code, mode: "OFF", rolloutPercent: 0, allowedUserIds: [], targetAt: null, version: 0, updatedAt: deps.now() });
  }
  return { evaluatedAt: deps.now().toISOString(), state, health: { ...health, oldestPendingAt: health.oldestPendingAt?.toISOString() ?? null, oldestPendingAgeSeconds: oldestAgeSeconds }, flags: flags.map((flag) => ({ ...flag, allowedUserIds: users(flag.allowedUserIds), targetAt: flag.targetAt?.toISOString() ?? null, updatedAt: flag.updatedAt.toISOString() })) };
}

export async function updateVehicleOperationsFeature(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const deps = dependencies(input);
  const user = await authorize(actor, "VEHICLE_ROLLOUT_MANAGE", null, deps);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Feature update must be an object.");
  const raw = value as Record<string, unknown>;
  const code = String(raw.code ?? "");
  const mode = String(raw.mode ?? "") as VehicleFeatureFlagRecord["mode"];
  const expectedVersion = Number(raw.expectedVersion);
  const rolloutPercent = Number(raw.rolloutPercent);
  const reason = String(raw.reason ?? "").trim();
  const locationId = typeof raw.locationId === "string" && raw.locationId.trim() ? raw.locationId.trim() : null;
  const targetAt = typeof raw.targetAt === "string" && raw.targetAt.trim() ? new Date(raw.targetAt) : null;
  if (!(ENTERPRISE_FEATURES as readonly string[]).includes(code)) throw new Error("Enterprise feature code is invalid.");
  if (!(["OFF", "SHADOW", "PILOT", "GENERAL"] as string[]).includes(mode)) throw new Error("Vehicle Operations rollout mode is invalid.");
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) throw new Error("Expected feature version is required.");
  if (!Number.isInteger(rolloutPercent) || rolloutPercent < 0 || rolloutPercent > 100) throw new Error("Rollout percent must be from 0 through 100.");
  if (reason.length < 10) throw new Error("Rollout changes require a reason of at least 10 characters.");
  if (targetAt && Number.isNaN(targetAt.getTime())) throw new Error("Rollout target date is invalid.");
  if (mode !== "PILOT" && rolloutPercent !== 0 && mode !== "GENERAL") throw new Error("Only PILOT or GENERAL mode can use a rollout percentage.");
  const flag = await deps.repository.updateFeatureFlag({ actorUserId: user.id, allowedUserIds: users(raw.allowedUserIds), code, correlationId: randomUUID(), expectedVersion, locationId, mode, organizationId: deps.organizationId, reason, rolloutPercent: mode === "GENERAL" ? 100 : rolloutPercent, targetAt });
  return { ...flag, allowedUserIds: users(flag.allowedUserIds), targetAt: flag.targetAt?.toISOString() ?? null, updatedAt: flag.updatedAt.toISOString() };
}

export async function rollbackVehicleOperationsFeature(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) { const deps = dependencies(input), user = await authorize(actor, "VEHICLE_ROLLOUT_MANAGE", null, deps); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Feature rollback must be an object."); const raw = value as Record<string, unknown>, code = String(raw.code ?? ""), expectedVersion = Number(raw.expectedVersion), locationId = typeof raw.locationId === "string" && raw.locationId.trim() ? raw.locationId.trim() : null, reason = String(raw.reason ?? "").trim(); if (!(ENTERPRISE_FEATURES as readonly string[]).includes(code)) throw new Error("Enterprise feature code is invalid."); if (!Number.isInteger(expectedVersion) || expectedVersion < 2) throw new Error("Exact current feature version is required for rollback."); if (reason.length < 10) throw new Error("Rollout rollback requires a reason of at least 10 characters."); if (!deps.repository.rollbackFeatureFlag) throw new Error("Feature rollback repository is unavailable."); const flag = await deps.repository.rollbackFeatureFlag({ actorUserId: user.id, code, correlationId: randomUUID(), expectedVersion, locationId, organizationId: deps.organizationId, reason }); return { ...flag, allowedUserIds: users(flag.allowedUserIds), updatedAt: flag.updatedAt.toISOString() }; }
