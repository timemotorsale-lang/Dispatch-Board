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

export const VEHICLE_OPERATIONS_FEATURES = ["VEHICLE_OPERATIONS_MASTER", "ENTERPRISE_COMMANDS", "VEHICLE_REGISTRY", "RETAIL_INVENTORY", "SHOP_OPERATIONS", "PARTS_OPERATIONS"] as const;
export type VehicleOperationsFeatureCode = (typeof VEHICLE_OPERATIONS_FEATURES)[number];

export function evaluateVehicleOperationsFeature(flags: VehicleFeatureFlagRecord[], code: VehicleOperationsFeatureCode, userId: string, locationId: string | null) {
  const applicable = (candidate: VehicleFeatureFlagRecord) => candidate.code === code && (candidate.locationId === locationId || candidate.locationId === null);
  const flag = flags.filter(applicable).sort((a, b) => Number(Boolean(b.locationId)) - Number(Boolean(a.locationId)))[0];
  const master = flags.filter((candidate) => candidate.code === "VEHICLE_OPERATIONS_MASTER" && (candidate.locationId === locationId || candidate.locationId === null)).sort((a, b) => Number(Boolean(b.locationId)) - Number(Boolean(a.locationId)))[0];
  if (code !== "VEHICLE_OPERATIONS_MASTER" && (!master || master.mode === "OFF")) return { enabled: false, executable: false, reason: "MASTER_DISABLED" } as const;
  if (!flag || flag.mode === "OFF") return { enabled: false, executable: false, reason: "FEATURE_DISABLED" } as const;
  if (flag.mode === "SHADOW") return { enabled: true, executable: false, reason: "SHADOW_ONLY" } as const;
  if (flag.mode === "GENERAL") return { enabled: true, executable: true, reason: "GENERAL_RELEASE" } as const;
  const cohort = users(flag.allowedUserIds);
  const bucket = createHash("sha256").update(`${flag.code}:${userId}`).digest()[0] % 100;
  const executable = cohort.includes(userId) || bucket < flag.rolloutPercent;
  return { enabled: true, executable, reason: executable ? "PILOT_ELIGIBLE" : "OUTSIDE_PILOT" } as const;
}

export async function getVehicleOperationsFoundation(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const deps = dependencies(input);
  await authorize(actor, "VEHICLE_HEALTH_VIEW", null, deps);
  const [flags, health] = await Promise.all([deps.repository.listFeatureFlags(deps.organizationId), deps.repository.readHealth(deps.organizationId, deps.now())]);
  const oldestAgeSeconds = health.oldestPendingAt ? Math.max(0, Math.round((deps.now().getTime() - health.oldestPendingAt.getTime()) / 1000)) : 0;
  const state = health.deadLetters > 0 || health.projectionFailures > 0 ? "CRITICAL" : oldestAgeSeconds > 60 || health.maxProjectionLagSeconds > 60 ? "DEGRADED" : "HEALTHY";
  return { evaluatedAt: deps.now().toISOString(), state, health: { ...health, oldestPendingAt: health.oldestPendingAt?.toISOString() ?? null, oldestPendingAgeSeconds: oldestAgeSeconds }, flags: flags.map((flag) => ({ ...flag, allowedUserIds: users(flag.allowedUserIds), updatedAt: flag.updatedAt.toISOString() })) };
}

export async function updateVehicleOperationsFeature(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const deps = dependencies(input);
  const user = await authorize(actor, "VEHICLE_ROLLOUT_MANAGE", null, deps);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Feature update must be an object.");
  const raw = value as Record<string, unknown>;
  const code = String(raw.code ?? "") as VehicleOperationsFeatureCode;
  const mode = String(raw.mode ?? "") as VehicleFeatureFlagRecord["mode"];
  const expectedVersion = Number(raw.expectedVersion);
  const rolloutPercent = Number(raw.rolloutPercent);
  const reason = String(raw.reason ?? "").trim();
  if (!VEHICLE_OPERATIONS_FEATURES.includes(code)) throw new Error("Vehicle Operations feature code is invalid.");
  if (!(["OFF", "SHADOW", "PILOT", "GENERAL"] as string[]).includes(mode)) throw new Error("Vehicle Operations rollout mode is invalid.");
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected feature version is required.");
  if (!Number.isInteger(rolloutPercent) || rolloutPercent < 0 || rolloutPercent > 100) throw new Error("Rollout percent must be from 0 through 100.");
  if (reason.length < 10) throw new Error("Rollout changes require a reason of at least 10 characters.");
  if (mode !== "PILOT" && rolloutPercent !== 0 && mode !== "GENERAL") throw new Error("Only PILOT or GENERAL mode can use a rollout percentage.");
  const flag = await deps.repository.updateFeatureFlag({ actorUserId: user.id, allowedUserIds: users(raw.allowedUserIds), code, correlationId: randomUUID(), expectedVersion, locationId: null, mode, organizationId: deps.organizationId, reason, rolloutPercent: mode === "GENERAL" ? 100 : rolloutPercent });
  return { ...flag, allowedUserIds: users(flag.allowedUserIds), updatedAt: flag.updatedAt.toISOString() };
}
