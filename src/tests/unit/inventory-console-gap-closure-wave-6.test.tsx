import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkflowLauncher } from "@/features/inventory/workflow-launcher";
import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { buildInventoryPriorityWork } from "@/server/inventory-console-home/priority-work";
import { auditInventoryConsoleWave6Traceability } from "@/server/inventory-console-wave6/traceability";
import { normalizeAuthorityCommand } from "@/server/inventory-governance/authority-domain";
import { executeAuthorityCommand } from "@/server/inventory-governance/authority-service";
import { contextualDecisionHref } from "@/server/inventory-governance/service";
import { getInventoryWorkflowLauncher } from "@/server/inventory-workflow-launcher/service";
import { normalizeOperationalReturnContext, withOperationalReturnContext } from "@/server/vehicle-discovery/domain";
import { downloadVehicleEvidence, uploadVehicleEvidence } from "@/server/vehicle-360/service";

const now = new Date("2026-07-18T18:00:00.000Z"), manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } }, staff: AuthenticatedUser = { ...manager, id: "staff", roles: ["Inventory Manager"] };

describe("Inventory Console gap closure Wave 6", () => {
  it("derives role/context-aware launcher choices and exposes complete intake contracts", () => {
    const withoutContext = getInventoryWorkflowLauncher(manager), withContext = getInventoryWorkflowLauncher(manager, { inventoryUnitId: "unit-1", repairJobId: "job-1", subjectId: "case-1", subjectType: "ACQUISITION", version: "3" });
    expect(withoutContext.cards.find(item => item.id === "WL-03")?.enabled).toBe(false);
    expect(withContext.cards.find(item => item.id === "WL-03")?.href).toContain("inventoryUnitId=unit-1");
    expect(withContext.cards.find(item => item.id === "WL-07")?.href).toContain("expectedVersion=3");
    expect(withContext.cards.every(item => item.creates.length && item.validation && item.confirmation && item.approval && item.recovery)).toBe(true);
    const markup = renderToStaticMarkup(<WorkflowLauncher model={withContext} />);
    for (const token of ["Open purpose-built intake", "Intake contract", "Validation:", "Confirmation:", "Recovery:"]) expect(markup).toContain(token);
  });

  it("builds deduplicated My Work, Team, and exception queues with hard tiers", () => {
    const source = [
      { id: "blocked", inventoryNumber: "INV-1", operatingState: "BLOCKED", targetAt: new Date("2026-07-19T00:00:00Z"), nextAction: "Resolve title", stateReason: "Title mismatch", financialAcquiredAt: new Date("2026-07-01T00:00:00Z"), ownerUser: { id: "manager", name: "Manager" }, vehicle: { vehicleNumber: "V-1", year: 2020, make: "Honda", model: "Accord" } },
      { id: "overdue", inventoryNumber: "INV-2", operatingState: "ACTIVE", targetAt: new Date("2026-07-17T00:00:00Z"), nextAction: "Finish photos", stateReason: null, financialAcquiredAt: new Date("2026-07-10T00:00:00Z"), ownerUser: { id: "other", name: "Other" }, vehicle: { vehicleNumber: "V-2", year: null, make: null, model: null } }
    ];
    expect(buildInventoryPriorityWork([...source, source[0]], "manager", "ALL", now).map(item => item.tier)).toEqual(["P0", "P1"]);
    expect(buildInventoryPriorityWork(source, "manager", "MY", now).map(item => item.id)).toEqual(["blocked"]);
    expect(buildInventoryPriorityWork(source, "manager", "TEAM", now)[1]).toMatchObject({ queue: "TEAM", reasonCode: "OVERDUE", escalated: true });
  });

  it("preserves safe cross-domain return context and rejects external redirects", () => {
    expect(withOperationalReturnContext("/vehicles/360/v-1", normalizeOperationalReturnContext("/vehicles/discovery?q=vin"))).toContain("returnTo=%2Fvehicles%2Fdiscovery");
    expect(() => normalizeOperationalReturnContext("https://attacker.example")).toThrow("internal application path");
    expect(() => normalizeOperationalReturnContext("//attacker.example")).toThrow("internal application path");
  });

  it("proves end-to-end evidence scanning, quarantine input, and restricted field access", async () => {
    const createEvidence = vi.fn(async (_command, data) => ({ duplicate: false, evidence: { id: "evidence", status: data.malwareStatus === "CLEAN" ? "AVAILABLE" : "QUARANTINED" } })), foundation = { listCapabilityGrants: vi.fn(async () => []), listFeatureFlags: vi.fn(async () => []) };
    const upload = await uploadVehicleEvidence(manager, { vehicleId: "vehicle", fileName: "unsafe.txt", contentType: "text/plain", contentBase64: Buffer.from([0x4d, 0x5a, 0, 0]).toString("base64"), category: "OTHER", accessLevel: "RESTRICTED", retentionUntil: "2027-07-18T00:00:00Z", subjectType: "VEHICLE", relationship: "SUPPORTS", idempotencyKey: "wave6-evidence-upload", reason: "Verify end-to-end quarantine and access behavior." }, { now: () => now, organizationId: "org", repository: { createEvidence } as never, foundationRepository: foundation as never, enforceRollout: false });
    expect(upload.evidence.status).toBe("QUARANTINED"); expect(createEvidence).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ malwareStatus: "DETECTED" }));
    const staffFoundation = { listCapabilityGrants: vi.fn(async () => [{ capability: "VEHICLE_EVIDENCE_VIEW", constraints: {}, effect: "ALLOW", locationId: null, validFrom: new Date("2026-01-01"), validTo: null }]) };
    await expect(downloadVehicleEvidence(staff, "restricted", { now: () => now, organizationId: "org", repository: { getEvidence: vi.fn(async () => ({ id: "restricted", status: "AVAILABLE", malwareStatus: "CLEAN", accessLevel: "RESTRICTED" })) } as never, foundationRepository: staffFoundation as never })).rejects.toThrow("VEHICLE_EVIDENCE_RESTRICTED_VIEW");
  });

  it("enforces versioned delegated limits, anti-splitting, fields, expiry, and separation", async () => {
    const normalized = normalizeAuthorityCommand({ action: "UPSERT_CAPABILITY_GRANT", userId: "staff", capability: "INVENTORY_UNIT_MANAGE", effect: "ALLOW", maxAmountCents: 10000, maxCumulativeAmountCents: 20000, fieldAllowlist: ["priceCents"], ownResourcesOnly: true, requiresIndependentApproval: true, validTo: "2026-08-18T00:00:00Z", expectedVersion: 0, idempotencyKey: "wave6-authority", reason: "Delegate bounded inventory authority for Wave 6." }, now);
    expect(normalized).toMatchObject({ maxAmountCents: 10000, maxCumulativeAmountCents: 20000, fieldAllowlist: ["priceCents"] });
    const grant = { capability: "INVENTORY_UNIT_MANAGE", effect: "ALLOW" as const, locationId: null, validFrom: now, validTo: new Date("2026-08-18T00:00:00Z"), constraints: { maxAmountCents: 10000, maxCumulativeAmountCents: 20000, fieldAllowlist: ["priceCents"], ownResourcesOnly: true, requiresIndependentApproval: true } };
    expect(evaluateVehicleCapability({ actor: staff, capability: "INVENTORY_UNIT_MANAGE", grants: [grant], locationId: null, amountCents: 9000, cumulativeRelatedAmountCents: 19000, requestedFields: ["priceCents"], resourceOwnerUserId: staff.id, priorActorUserId: "other", now }).allowed).toBe(true);
    expect(evaluateVehicleCapability({ actor: staff, capability: "INVENTORY_UNIT_MANAGE", grants: [grant], locationId: null, amountCents: 9000, cumulativeRelatedAmountCents: 21000, requestedFields: ["priceCents"], resourceOwnerUserId: staff.id, priorActorUserId: "other", now }).allowed).toBe(false);
    expect(evaluateVehicleCapability({ actor: staff, capability: "INVENTORY_UNIT_MANAGE", grants: [grant], locationId: null, amountCents: 9000, cumulativeRelatedAmountCents: 19000, requestedFields: ["restrictedField"], resourceOwnerUserId: staff.id, priorActorUserId: "other", now }).allowed).toBe(false);
    const upsert = vi.fn(async () => ({ duplicate: false, result: { grantId: "grant" }, version: 1 }));
    await expect(executeAuthorityCommand(manager, { ...normalized, validFrom: normalized.validFrom.toISOString(), validTo: normalized.validTo?.toISOString() }, { now: () => now, organizationId: "org", repository: { upsert } as never })).resolves.toMatchObject({ version: 1 });
    await expect(executeAuthorityCommand(staff, normalized, { now: () => now, organizationId: "org", repository: { upsert } as never })).rejects.toThrow("General Manager");
  });

  it("adds exact decision/version/policy/return context and exhaustively traces Wave 6 actions", () => {
    const href = contextualDecisionHref({ id: "DISPOSITION:case-1", kind: "APPROVAL", domain: "DISPOSITION", type: "PRICE", title: "Approval", subject: "Unit", owner: "Manager", location: "Main", dueAt: now.toISOString(), ageHours: 1, overdue: false, version: 4, policyVersion: "DWH/v2", amountCents: 1000, evidence: [], state: "WAITING", actionLabel: "Open", actionHref: "/vehicles/disposition-wholesale?caseId=case-1" });
    for (const token of ["decisionId=DISPOSITION%3Acase-1", "expectedVersion=4", "policyVersion=DWH%2Fv2", "returnTo="]) expect(href).toContain(token);
    expect(auditInventoryConsoleWave6Traceability()).toMatchObject({ disposition: "CONFORMS", blockers: [], requiredActions: 20, tracedActions: 20 });
  });
});
