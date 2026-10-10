import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { explainWorkPacketEligibility, normalizeInventoryWorkPacketCreate, normalizeInventoryWorkPacketPosition } from "@/server/inventory-execution/work-packet-domain";
import { createInventoryWorkPacket, getInventoryWorkPacket, setInventoryWorkPacketPosition } from "@/server/inventory-execution/work-packet-service";

const manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const technician: AuthenticatedUser = { ...manager, id: "tech", roles: ["Technician"] };
const now = new Date("2026-07-19T18:00:00.000Z");
const snapshots = {
  readinessSnapshot: { items: [{ code: "VEHICLE_PRESENT", label: "Vehicle present", required: true, satisfied: true, source: "Vehicle Registry" }] },
  dependencySnapshot: { items: [{ code: "KEYS", label: "Keys available", required: true, satisfied: true, source: "Custody" }] },
  evidenceRequirements: { items: [{ code: "RECEIPT_PHOTOS", label: "Receipt photos", required: true, satisfied: false, source: "Evidence policy" }] }
};
const createInput = { ...snapshots, definitionOfDone: "Identity, custody, and receipt photos are recorded.", estimatedMinutes: 20, idempotencyKey: "packet-create-1", nextAction: "Complete receiving inspection", policyVersion: "inventory-eos-mvp/v1", purpose: "Receive the vehicle into controlled custody.", readiness: "READY", reason: "Create controlled receiving work.", stageCode: "RECEIPT", state: "CURRENT", targetAt: "2026-07-19T20:00:00.000Z", taskId: "task-1", urgency: "P1", urgencyReason: "Vehicle is physically on site and custody must be recorded.", vehicleId: "vehicle-1" };
const foundation = { listCapabilityGrants: vi.fn(async () => []), listFeatureFlags: vi.fn(async () => []) };

describe("Inventory EOS shared work packet", () => {
  it("normalizes the minimum work contract and preserves structured source evidence", () => {
    expect(normalizeInventoryWorkPacketCreate(createInput)).toMatchObject({ state: "CURRENT", readiness: "READY", urgency: "P1", estimatedMinutes: 20, policyVersion: "inventory-eos-mvp/v1" });
  });

  it("fails closed when READY contradicts a required readiness check", () => {
    expect(() => normalizeInventoryWorkPacketCreate({ ...createInput, readinessSnapshot: { items: [{ code: "KEYS", label: "Keys", required: true, satisfied: false, source: "Custody" }] } })).toThrow("Readiness cannot be READY");
  });

  it("rejects invalid timing, terminal creation states, and unstructured snapshots", () => {
    expect(() => normalizeInventoryWorkPacketCreate({ ...createInput, nextCheckAt: "2026-07-20T00:00:00Z" })).toThrow("Next check time cannot be after");
    expect(() => normalizeInventoryWorkPacketCreate({ ...createInput, state: "COMPLETED" })).toThrow("must be planned, current, or staged");
    expect(() => normalizeInventoryWorkPacketCreate({ ...createInput, dependencySnapshot: {} })).toThrow("must contain an items list");
  });

  it("explains eligibility deterministically without inventing authority", () => {
    expect(explainWorkPacketEligibility({ readiness: "NOT_READY", dependencies: { items: [{ required: true, satisfied: false }] }, state: "PLANNED" })).toEqual({ eligible: false, reasons: ["READINESS_NOT_READY", "REQUIRED_DEPENDENCY_UNSATISFIED"], ruleVersion: "inventory-eos-mvp/v1" });
  });

  it("requires recon authority to create or position work", async () => {
    const delegatedFoundation = { listCapabilityGrants: vi.fn(async () => [{ capability: "INVENTORY_UNIT_MANAGE", constraints: {}, effect: "ALLOW" as const, locationId: null, validFrom: new Date("2026-01-01"), validTo: null }]), listFeatureFlags: vi.fn(async () => []) };
    const repository = { create: vi.fn(), find: vi.fn(), setPosition: vi.fn() };
    await expect(createInventoryWorkPacket(technician, createInput, { foundationRepository: foundation as never, now: () => now, organizationId: "org", repository })).rejects.toThrow("INVENTORY_RECON_MANAGE");
    await expect(setInventoryWorkPacketPosition(technician, "packet-1", { expectedVersion: 1, idempotencyKey: "position-1", reason: "Stage the approved next work.", state: "STAGED" }, { foundationRepository: foundation as never, now: () => now, organizationId: "org", repository })).rejects.toThrow("INVENTORY_RECON_MANAGE");
    expect(repository.create).not.toHaveBeenCalled();
    await createInventoryWorkPacket(technician, createInput, { foundationRepository: delegatedFoundation as never, now: () => now, organizationId: "org", repository });
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it("issues a versioned, auditable create command through the existing enterprise ledger", async () => {
    const create = vi.fn(async (command, data) => ({ duplicate: false, result: { id: data.id, state: data.state }, version: 1 }));
    const result = await createInventoryWorkPacket(manager, createInput, { foundationRepository: foundation as never, now: () => now, organizationId: "org", repository: { create, find: vi.fn(), setPosition: vi.fn() } });
    expect(result).toMatchObject({ duplicate: false, version: 1 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ commandType: "CREATE_INVENTORY_WORK_PACKET", domain: "INVENTORY_EXECUTION", expectedVersion: 0, idempotencyKey: "packet-create-1", reason: "Create controlled receiving work.", subjectType: "INVENTORY_WORK_PACKET" }), expect.objectContaining({ createdByUserId: "manager", taskId: "task-1", vehicleId: "vehicle-1" }));
  });

  it("propagates duplicate success and optimistic-concurrency conflicts truthfully", async () => {
    const duplicateRepository = { create: vi.fn(async () => ({ duplicate: true, result: { id: "packet-1" }, version: 1 })), find: vi.fn(), setPosition: vi.fn(async () => { throw new EnterpriseCommandConflictError("Expected version 1, but current version is 2.", "VERSION_CONFLICT"); }) };
    await expect(createInventoryWorkPacket(manager, createInput, { foundationRepository: foundation as never, organizationId: "org", repository: duplicateRepository })).resolves.toMatchObject({ duplicate: true, version: 1 });
    await expect(setInventoryWorkPacketPosition(manager, "packet-1", { expectedVersion: 1, idempotencyKey: "position-1", reason: "Stage the approved next work.", state: "STAGED" }, { foundationRepository: foundation as never, organizationId: "org", repository: duplicateRepository })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });

  it("requires view capability and returns unavailable records as not found", async () => {
    const deniedFoundation = { listCapabilityGrants: vi.fn(async () => []), listFeatureFlags: vi.fn(async () => []) };
    await expect(getInventoryWorkPacket(technician, "packet-1", { foundationRepository: deniedFoundation as never, organizationId: "org", repository: { create: vi.fn(), find: vi.fn(), setPosition: vi.fn() } })).rejects.toThrow("Vehicle capability required: INVENTORY_UNIT_VIEW");
    await expect(getInventoryWorkPacket(manager, "packet-1", { foundationRepository: foundation as never, organizationId: "org", repository: { create: vi.fn(), find: vi.fn(async () => null), setPosition: vi.fn() } })).rejects.toThrow("was not found");
  });

  it("only accepts explicit manager-controlled position states with positive versions", () => {
    expect(normalizeInventoryWorkPacketPosition({ expectedVersion: 3, idempotencyKey: "position-3", reason: "Make the prepared packet current.", state: "CURRENT" })).toMatchObject({ expectedVersion: 3, state: "CURRENT" });
    expect(() => normalizeInventoryWorkPacketPosition({ expectedVersion: 0, idempotencyKey: "position-0", reason: "Invalid stale update reason.", state: "CURRENT" })).toThrow("positive whole number");
    expect(() => normalizeInventoryWorkPacketPosition({ expectedVersion: 1, idempotencyKey: "position-x", reason: "Do not bypass completion gates.", state: "COMPLETED" })).toThrow("may only plan, make current, stage, or cancel");
  });
});
