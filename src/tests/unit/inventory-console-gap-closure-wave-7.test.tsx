import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InventoryFrontlineWorkspace } from "@/features/inventory/inventory-frontline-workspace";
import type { AuthenticatedUser } from "@/server/auth/store";
import { normalizeAcquisitionReversal } from "@/server/acquisition-appraisal/domain";
import { listAcquisitionCases, runAcquisitionCaseCommand } from "@/server/acquisition-appraisal/service";
import { evaluateVehicleOperationsFeature, rollbackVehicleOperationsFeature, updateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { auditInventoryConsoleWave7Conformance } from "@/server/inventory-console-wave7/conformance";
import { describeFrontlineRecovery, normalizeInspection, normalizePublicationException, normalizeQualityFailure, normalizeReconScopeChange, normalizeTitleHold, planFrontlineEscalation } from "@/server/inventory-frontline/domain";
import { evaluateFrontlineEscalations, runFrontlineCommand } from "@/server/inventory-frontline/service";
import { evaluateFrontlineEscalationsForSystem } from "@/server/inventory-frontline/system";

const now = new Date("2026-07-19T12:00:00.000Z"), manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } }, command = { expectedVersion: 2, idempotencyKey: "wave7-command", reason: "Record governed Wave 7 recovery evidence." };
const flags = (locationId: string | null, mode: "OFF" | "SHADOW" | "PILOT" | "GENERAL", version = 1) => ({ id: `${locationId ?? "global"}-${mode}`, organizationId: "org", locationId, code: "RETAIL_INVENTORY", mode, rolloutPercent: mode === "GENERAL" ? 100 : 0, allowedUserIds: [], version, updatedAt: now });

describe("Inventory Console gap closure Wave 7", () => {
  it("honors rollout inheritance, location override, pause, exact update scope, and rollback", async () => {
    const master = { ...flags(null, "GENERAL"), code: "VEHICLE_OPERATIONS_MASTER" };
    expect(evaluateVehicleOperationsFeature([master, flags(null, "GENERAL"), flags("loc", "OFF")], "RETAIL_INVENTORY", manager.id, "loc")).toMatchObject({ executable: false, reason: "FEATURE_DISABLED" });
    expect(evaluateVehicleOperationsFeature([master, flags(null, "GENERAL")], "RETAIL_INVENTORY", manager.id, "loc")).toMatchObject({ executable: true, reason: "GENERAL_RELEASE" });
    const updateFeatureFlag = vi.fn(async input => ({ ...flags(input.locationId, input.mode, input.expectedVersion + 1), rolloutPercent: input.rolloutPercent }));
    await updateVehicleOperationsFeature(manager, { code: "RETAIL_INVENTORY", locationId: "loc", mode: "OFF", rolloutPercent: 0, expectedVersion: 2, reason: "Pause the affected location while recovery is verified." }, { organizationId: "org", repository: { listCapabilityGrants: vi.fn(async () => []), updateFeatureFlag } as never });
    expect(updateFeatureFlag).toHaveBeenCalledWith(expect.objectContaining({ locationId: "loc", mode: "OFF" }));
    const rollbackFeatureFlag = vi.fn(async input => ({ ...flags(input.locationId, "SHADOW", input.expectedVersion + 1) }));
    await rollbackVehicleOperationsFeature(manager, { action: "ROLLBACK", code: "RETAIL_INVENTORY", locationId: "loc", expectedVersion: 3, reason: "Restore the immediately prior reviewed rollout state." }, { organizationId: "org", repository: { listCapabilityGrants: vi.fn(async () => []), rollbackFeatureFlag } as never });
    expect(rollbackFeatureFlag).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 3, locationId: "loc" }));
  });

  it("creates explicit inspection, recon, QC, title, and publication recovery contracts", () => {
    expect(normalizeInspection({ ...command, diagnosticRequired: true, evidenceObjectIds: ["e"], identityConflict: false, safetyCriticalFail: false, templateCode: "I", templateComplete: true, templateVersion: 1, titleConcern: true }).blockers).toEqual(expect.arrayContaining(["TITLE_CONCERN", "DIAGNOSTIC_REQUIRED"]));
    expect(normalizeReconScopeChange({ ...command, changedAt: now, changeSummary: "Transmission scope added after diagnosis.", priorPlanVersion: 2, proposedAmountCents: 300000 }).snapshot).toMatchObject({ requiresReapproval: true, priorPlanVersion: 2 });
    expect(normalizeQualityFailure({ ...command, evidenceObjectIds: ["qc-evidence"], failedChecks: ["BRAKES"], reviewerUserId: "reviewer" }, now).snapshot).toMatchObject({ reworkRequired: true, failedChecks: ["BRAKES"] });
    expect(normalizeTitleHold({ ...command, blockers: ["LIEN_RELEASE"], dueAt: "2026-07-20T12:00:00Z", externalDependency: "LENDER", ownerUserId: "title-owner" }, now).snapshot).toMatchObject({ recoveryStage: "TITLE_DOCUMENT_READINESS", ownerUserId: "title-owner" });
    expect(normalizePublicationException({ ...command, channel: "SITE", desiredState: "PUBLISHED", errorCode: "REJECTED", observedState: "DRAFT", retryAt: "2026-07-20T12:00:00Z" }, now).snapshot).toMatchObject({ recoveryStage: "MERCHANDISING_AND_PRICING", errorCode: "REJECTED" });
  });

  it("plans deterministic overdue escalation and projects honest exact recovery", () => {
    const workflow = { id: "wf", version: 4, stage: "IN_TRANSIT" as const, operatingState: "ACTIVE", ownerUserId: "owner", targetAt: new Date("2026-07-18T12:00:00Z") }, plan = planFrontlineEscalation(workflow, now);
    expect(plan).toMatchObject({ code: "TRANSPORT_ARRIVAL_OVERDUE", recoveryStage: "IN_TRANSIT" });
    expect(plan?.idempotencyKey).toBe("wave7-escalation:wf:4:TRANSPORT_ARRIVAL_OVERDUE");
    expect(describeFrontlineRecovery({ ...workflow, exceptionSnapshot: {}, stage: "IN_TRANSIT" }, now)).toMatchObject({ state: "ESCALATION_DUE", recoveryStage: "IN_TRANSIT" });
    expect(describeFrontlineRecovery({ ...workflow, exceptionSnapshot: { recoveryStage: "TITLE_DOCUMENT_READINESS" }, stage: "HOLD", operatingState: "BLOCKED" }, now)).toMatchObject({ state: "CORRECTION_REQUIRED", recoveryStage: "TITLE_DOCUMENT_READINESS" });
  });

  it("persists escalation and reopens to the recorded owning stage", async () => {
    const transition = vi.fn(async (_command, data) => ({ version: 5, result: data })), item = { id: "wf", version: 4, stage: "IN_TRANSIT", operatingState: "ACTIVE", ownerUserId: "owner", locationId: "loc", targetAt: new Date("2026-07-18T12:00:00Z"), exceptionSnapshot: {} };
    const foundation = { listCapabilityGrants: vi.fn(async () => []) };
    await expect(evaluateFrontlineEscalations(manager, { enforceRollout: false, foundationRepository: foundation as never, now: () => now, organizationId: "org", repository: { list: vi.fn(async () => [item]), transition } as never })).resolves.toMatchObject({ evaluated: 1, escalated: 1 });
    expect(transition).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toStage: "HOLD", toState: "BLOCKED" }));
    transition.mockClear();
    await runFrontlineCommand(manager, "wf", { action: "REOPEN_FOR_CORRECTION", ...command }, { enforceRollout: false, foundationRepository: foundation as never, now: () => now, organizationId: "org", repository: { get: vi.fn(async () => ({ ...item, stage: "HOLD", operatingState: "BLOCKED", exceptionSnapshot: { recoveryStage: "TITLE_DOCUMENT_READINESS" } })), transition } as never });
    expect(transition).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toStage: "TITLE_DOCUMENT_READINESS", toState: "ACTIVE" }));
  });

  it("requires independently verified compensation before terminal acquisition reversal", async () => {
    expect(() => normalizeAcquisitionReversal({ ...command, custodyDisposition: "RETURNED", evidenceObjectIds: ["e"], paymentDisposition: "REVERSED", titleDisposition: "RELEASED", verifiedByUserId: manager.id }, manager.id, now)).toThrow("independent verifier");
    const completeReversal = vi.fn(async () => ({ version: 3, result: { status: "REVERSED" } }));
    await runAcquisitionCaseCommand(manager, "case", { action: "COMPLETE_REVERSAL", ...command, custodyDisposition: "RETURNED", evidenceObjectIds: ["e"], paymentDisposition: "REVERSED", titleDisposition: "RELEASED", verifiedByUserId: "reviewer" }, { enforceRollout: false, foundationRepository: { listCapabilityGrants: vi.fn(async () => []) } as never, now: () => now, organizationId: "org", repository: { get: vi.fn(async () => ({ id: "case", inventoryUnitId: "unit", locationId: "loc", status: "REVERSAL_REVIEW" })), completeReversal } as never });
    expect(completeReversal).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ verifiedByUserId: "reviewer", compensation: { custody: "RETURNED", payment: "REVERSED", title: "RELEASED" } }));
    await expect(listAcquisitionCases(manager, {}, { foundationRepository: { listCapabilityGrants: vi.fn(async () => []) } as never, now: () => now, organizationId: "org", repository: { list: vi.fn(async () => [{ status: "REVERSED" }]) } as never })).resolves.toMatchObject({ totals: { active: 0 } });
  });

  it("fails closed without a configured system actor and accepts an attributable manager", async () => {
    await expect(evaluateFrontlineEscalationsForSystem({ actorEmail: null })).rejects.toThrow("INVENTORY_AUTOMATION_ACTOR_EMAIL");
    const evaluate = vi.fn(async actor => ({ actorId: actor.id }));
    await expect(evaluateFrontlineEscalationsForSystem({ actorEmail: manager.email, evaluate, loadActor: vi.fn(async () => manager) })).resolves.toEqual({ actorId: manager.id });
  });

  it("renders purpose-built rework controls and exhaustively evidences all 11 slices", () => {
    const item = { id: "wf", version: 1, stage: "QUALITY_AND_SAFETY_VERIFICATION", operatingState: "ACTIVE", targetAt: now.toISOString(), nextAction: "Verify", ownerUser: { id: "owner", name: "Owner" }, location: { id: "loc", name: "Main" }, repairOrder: { id: "ro", repairOrderNumber: "RO-1" }, inventoryUnit: { id: "unit", inventoryNumber: "INV-1", lifecycleStage: "RECONDITIONING", vehicle: { vehicleNumber: "V-1", year: 2020, make: "Honda", model: "Accord" } }, events: [] };
    const markup = renderToStaticMarkup(<InventoryFrontlineWorkspace initial={{ contractVersion: "inv-itf/1.1.0-wave7", freshness: "COMPLETE", generatedAt: now.toISOString(), items: [item], totals: { active: 1, blocked: 0, frontlineReady: 0, overdue: 0 } }} options={{ units: [], users: [{ id: "owner", name: "Owner" }, { id: "reviewer", name: "Reviewer" }] }} />);
    expect(markup).toContain("Record failed QC and create rework");
    expect(auditInventoryConsoleWave7Conformance()).toMatchObject({ disposition: "REPOSITORY_CONFORMS_EXTERNAL_EVIDENCE_PENDING", blockers: [], expectedSlices: 11, evidencedSlices: 11 });
  });
});
