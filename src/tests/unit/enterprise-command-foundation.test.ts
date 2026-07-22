import { describe, expect, it } from "vitest";

import { EnterpriseCommandConflictError, hashEnterpriseCommand, normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { EnterpriseCommandRepository, VehicleFeatureFlagRecord } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature, executeEnterpriseVehicleCommand, getVehicleOperationsFoundation, updateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import type { AuthenticatedUser } from "@/server/auth/store";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const staff: AuthenticatedUser = { id: "staff-1", name: "Staff", email: "staff@example.com", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const flag = (code: string, mode: VehicleFeatureFlagRecord["mode"]): VehicleFeatureFlagRecord => ({ id: code, organizationId: "org-1", locationId: null, code, mode, rolloutPercent: mode === "GENERAL" ? 100 : 0, allowedUserIds: [], targetAt: null, version: 1, updatedAt: new Date("2026-07-14T00:00:00Z") });

function repository(overrides: Partial<EnterpriseCommandRepository> = {}): EnterpriseCommandRepository {
  return {
    async commit(input) { return { command: { id: "cmd-1", organizationId: input.organizationId, domain: input.domain, commandType: input.commandType, idempotencyKey: input.idempotencyKey, requestHash: input.requestHash, correlationId: input.correlationId, resultingVersion: input.expectedVersion + 1, resultSnapshot: { version: input.expectedVersion + 1 } }, duplicate: false, version: input.expectedVersion + 1 }; },
    async listCapabilityGrants() { return []; },
    async listFeatureFlags() { return [flag("VEHICLE_OPERATIONS_MASTER", "GENERAL"), flag("ENTERPRISE_COMMANDS", "SHADOW")]; },
    async updateFeatureFlag(input) { return { ...flag(input.code, input.mode), version: input.expectedVersion + 1, rolloutPercent: input.rolloutPercent, allowedUserIds: input.allowedUserIds, targetAt: input.targetAt }; },
    async readHealth() { return { commands24h: 4, failedCommands24h: 0, pendingOutbox: 1, deadLetters: 0, oldestPendingAt: new Date("2026-07-13T23:59:50Z"), projectionFailures: 0, maxProjectionLagSeconds: 5 }; },
    async claimReadyOutbox() { return []; }, async markOutboxFailed() {}, async markOutboxPublished() {}, ...overrides
  };
}

describe("enterprise command foundation", () => {
  it("creates stable request hashes and validates command identity", () => {
    expect(hashEnterpriseCommand({ b: 2, a: 1 })).toBe(hashEnterpriseCommand({ a: 1, b: 2 }));
    expect(() => normalizeEnterpriseCommand({ actorUserId: "user", commandType: "verify", domain: "vehicle", expectedVersion: -1, idempotencyKey: "key", locationId: null, organizationId: "org", payload: {}, reason: "valid reason text", subjectId: "one", subjectType: "control" })).toThrow("Expected version");
  });

  it("uses explicit deny before manager defaults and explicit grants for staff", () => {
    const grant = { capability: "VEHICLE_COMMAND_EXECUTE", constraints: {}, effect: "ALLOW" as const, locationId: "loc-1", validFrom: new Date("2026-01-01"), validTo: null };
    expect(evaluateVehicleCapability({ actor: staff, capability: "VEHICLE_COMMAND_EXECUTE", grants: [grant], locationId: "loc-1", now: new Date("2026-07-14") }).allowed).toBe(true);
    expect(evaluateVehicleCapability({ actor: manager, capability: "VEHICLE_COMMAND_EXECUTE", grants: [{ ...grant, effect: "DENY" }], locationId: "loc-1", now: new Date("2026-07-14") }).reason).toBe("EXPLICIT_DENY");
  });

  it("lets mechanics read repair orders without granting repair-order management", () => {
    const now = new Date("2026-07-14");
    expect(evaluateVehicleCapability({ actor: staff, capability: "INVENTORY_UNIT_VIEW", grants: [], locationId: null, now })).toEqual({ allowed: true, reason: "ROLE_DEFAULT" });
    expect(evaluateVehicleCapability({ actor: staff, capability: "INVENTORY_UNIT_MANAGE", grants: [], locationId: null, now }).allowed).toBe(false);
    expect(evaluateVehicleCapability({ actor: staff, capability: "REPAIR_ORDER_VIEW", grants: [], locationId: null, now })).toEqual({ allowed: true, reason: "ROLE_DEFAULT" });
    expect(evaluateVehicleCapability({ actor: staff, capability: "VEHICLE_IDENTITY_CREATE", grants: [], locationId: null, now })).toEqual({ allowed: true, reason: "ROLE_DEFAULT" });
    expect(evaluateVehicleCapability({ actor: staff, capability: "VEHICLE_COMMAND_EXECUTE", grants: [], locationId: null, now }).allowed).toBe(false);
    expect(evaluateVehicleCapability({ actor: staff, capability: "REPAIR_ORDER_MANAGE", grants: [], locationId: null, now }).allowed).toBe(false);
    expect(evaluateVehicleCapability({ actor: staff, capability: "REPAIR_ORDER_VIEW", grants: [{ capability: "REPAIR_ORDER_VIEW", constraints: {}, effect: "DENY", locationId: null, validFrom: new Date("2026-01-01"), validTo: null }], locationId: null, now }).reason).toBe("EXPLICIT_DENY");
  });

  it("enforces delegated ownership and amount constraints", () => {
    const grant = { capability: "VEHICLE_COMMAND_EXECUTE", constraints: { maxAmountCents: 50_000, ownResourcesOnly: true }, effect: "ALLOW" as const, locationId: "loc-1", validFrom: new Date("2026-01-01"), validTo: null };
    expect(evaluateVehicleCapability({ actor: staff, amountCents: 49_000, capability: "VEHICLE_COMMAND_EXECUTE", grants: [grant], locationId: "loc-1", now: new Date("2026-07-14"), resourceOwnerUserId: staff.id }).allowed).toBe(true);
    expect(evaluateVehicleCapability({ actor: staff, amountCents: 51_000, capability: "VEHICLE_COMMAND_EXECUTE", grants: [grant], locationId: "loc-1", now: new Date("2026-07-14"), resourceOwnerUserId: staff.id }).reason).toBe("CAPABILITY_REQUIRED");
    expect(evaluateVehicleCapability({ actor: staff, amountCents: 49_000, capability: "VEHICLE_COMMAND_EXECUTE", grants: [grant], locationId: "loc-1", now: new Date("2026-07-14"), resourceOwnerUserId: "someone-else" }).reason).toBe("CAPABILITY_REQUIRED");
  });

  it("executes a normalized authorized command", async () => {
    const result = await executeEnterpriseVehicleCommand(manager, { commandType: "verify", domain: "vehicle_operations", expectedVersion: 0, idempotencyKey: "verify-1", locationId: null, payload: { proof: true }, reason: "Verify atomic command foundation.", subjectId: "foundation", subjectType: "control" }, { organizationId: "org-1", repository: repository() });
    expect(result).toMatchObject({ commandId: "cmd-1", duplicate: false, version: 1 });
  });

  it("evaluates rollout modes without making shadow mode executable", () => {
    const flags = [flag("VEHICLE_OPERATIONS_MASTER", "GENERAL"), flag("ENTERPRISE_COMMANDS", "SHADOW")];
    expect(evaluateVehicleOperationsFeature(flags, "ENTERPRISE_COMMANDS", "user", null)).toEqual({ enabled: true, executable: false, reason: "SHADOW_ONLY", targetAt: null });
  });

  it("summarizes command, outbox, and projection health", async () => {
    const model = await getVehicleOperationsFoundation(manager, { now: () => new Date("2026-07-14T00:00:00Z"), organizationId: "org-1", repository: repository() });
    expect(model.state).toBe("HEALTHY"); expect(model.health.oldestPendingAgeSeconds).toBe(10);
  });

  it("uses expected feature versions for rollout changes", async () => {
    const result = await updateVehicleOperationsFeature(manager, { code: "ENTERPRISE_COMMANDS", mode: "GENERAL", rolloutPercent: 100, expectedVersion: 2, reason: "Approve general command rollout.", targetAt: "2026-07-22T12:00:00.000Z" }, { organizationId: "org-1", repository: repository() });
    expect(result).toMatchObject({ mode: "GENERAL", rolloutPercent: 100, targetAt: "2026-07-22T12:00:00.000Z", version: 3 });
  });

  it("exposes typed command conflicts", () => {
    expect(new EnterpriseCommandConflictError("stale", "VERSION_CONFLICT").code).toBe("VERSION_CONFLICT");
  });
});
