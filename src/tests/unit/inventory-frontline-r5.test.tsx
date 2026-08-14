import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InventoryFrontlineWorkspace } from "@/features/inventory/inventory-frontline-workspace";
import { evaluateFrontlineRelease, normalizeDelivery, normalizeFrontlineStart, normalizeInspection, normalizeMerchandising, normalizeQuality, normalizeReceipt, normalizeTitle, normalizeTransport } from "@/server/inventory-frontline/domain";
import { legacyAcquisitionCaseId } from "@/server/acquisition-appraisal/service";
import { frontlineWorkflowId } from "@/server/inventory-frontline/service";

const now = new Date("2026-07-18T15:00:00.000Z");
const command = { expectedVersion: 1, idempotencyKey: "idem-r5", reason: "Reviewed INV-ITF evidence." };

describe("R5 Inventory-to-Frontline domain", () => {
  it("derives one stable workflow identity per organization and InventoryUnit", () => {
    expect(frontlineWorkflowId("org-1", "unit-1")).toBe(frontlineWorkflowId("org-1", "unit-1"));
    expect(frontlineWorkflowId("org-1", "unit-1")).not.toBe(frontlineWorkflowId("org-1", "unit-2"));
  });

  it("requires a future workflow target", () => {
    expect(() => normalizeFrontlineStart({ ...command, inventoryUnitId: "unit-1", ownerUserId: "user-1", policyVersion: "P1", targetAt: "2026-07-18T14:00:00.000Z" }, now)).toThrow("future");
  });

  it("requires transport authority and release evidence", () => {
    const value = { ...command, transportRequired: true, method: "CARRIER", expectedAt: "2026-07-20T15:00:00.000Z", estimatedCostCents: 100_000 };
    expect(() => normalizeTransport(value, now)).toThrow("cost authority");
    expect(() => normalizeTransport({ ...value, costAuthorized: true }, now)).toThrow("release evidence");
  });

  it("does not let an ETA complete transport", () => {
    expect(() => normalizeDelivery({ ...command, delivered: true, observedAt: now.toISOString() })).toThrow("ETA alone");
  });

  it("holds receipt on identity, custody, or evidence failures", () => {
    const result = normalizeReceipt({ ...command, arrivedAt: now.toISOString(), conditionSummary: "Observed", custodyAccepted: false, evidenceObjectIds: [], identityMatch: false, keyCount: 1, mileage: 10 });
    expect(result.blockers).toEqual(expect.arrayContaining(["IDENTITY_MISMATCH", "CUSTODY_NOT_ACCEPTED", "RECEIPT_EVIDENCE_MISSING"]));
  });

  it("derives one stable controlled acquisition-provenance identity for legacy inventory", () => {
    expect(legacyAcquisitionCaseId("org-1", "unit-1")).toBe(legacyAcquisitionCaseId("org-1", "unit-1"));
    expect(legacyAcquisitionCaseId("org-1", "unit-1")).not.toBe(legacyAcquisitionCaseId("org-1", "unit-2"));
  });

  it("allows receipt evidence to be deferred with an accountable reason", () => {
    const result = normalizeReceipt({ ...command, arrivedAt: now.toISOString(), conditionSummary: "Remote receiving started", custodyAccepted: true, evidenceDeferredReason: "Photos unavailable until onsite staff sees the vehicle.", evidenceObjectIds: [], identityMatch: true, keyCount: 1, mileage: 10 });
    expect(result.blockers).not.toContain("RECEIPT_EVIDENCE_MISSING");
    expect(result.snapshot.evidenceDeferredReason).toBe("Photos unavailable until onsite staff sees the vehicle.");
  });

  it("holds inspection on critical safety or identity failures", () => {
    const result = normalizeInspection({ ...command, checklistResults: [{ code: "SAFETY", label: "Safety inspection", status: "CONCERN" }], evidenceObjectIds: ["e-1"], identityConflict: true, safetyCriticalFail: true, templateCode: "INSPECT", templateComplete: true, templateVersion: 1 });
    expect(result.blockers).toEqual(expect.arrayContaining(["SAFETY_CRITICAL_FAIL", "IDENTITY_CONFLICT"]));
  });

  it("persists the complete receiving checklist and rejects pending results", () => {
    expect(normalizeInspection({ ...command, checklistResults: [{ code: "VIN", evidenceObjectIds: ["e-1"], label: "VIN identity", notes: "VIN label matched", status: "PASS" }], evidenceObjectIds: ["e-1"], templateCode: "TMS-RECEIVING-IQI", templateComplete: true, templateVersion: 1 }).snapshot.checklistResults).toEqual([{ code: "VIN", evidenceObjectIds: ["e-1"], label: "VIN identity", notes: "VIN label matched", status: "PASS" }]);
    expect(() => normalizeInspection({ ...command, checklistResults: [{ code: "VIN", label: "VIN identity", status: "PENDING" }], evidenceObjectIds: ["e-1"], templateCode: "TMS-RECEIVING-IQI", templateComplete: true, templateVersion: 1 })).toThrow("Pass, Concern, Not Applicable, or Deferred");
  });

  it("allows receiving inspection evidence to be deferred without forcing diagnosis", () => {
    const result = normalizeInspection({
      ...command,
      checklistResults: [{ code: "SCAN", evidenceObjectIds: [], label: "Diagnostic baseline", notes: "Bodywork only; scan deferred until vehicle is onsite.", status: "DEFERRED" }],
      diagnosticRequired: false,
      evidenceDeferredReason: "Bodywork only; scan deferred until vehicle is onsite.",
      evidenceObjectIds: [],
      templateCode: "TMS-RECEIVING-IQI",
      templateComplete: true,
      templateVersion: 1
    });
    expect(result.blockers).not.toContain("INSPECTION_EVIDENCE_MISSING");
    expect(result.blockers).not.toContain("DIAGNOSTIC_REQUIRED");
    expect(result.snapshot.checklistResults[0].status).toBe("DEFERRED");
    expect(result.snapshot.evidenceDeferredReason).toBe("Bodywork only; scan deferred until vehicle is onsite.");
  });

  it("never averages away a failed critical quality gate", () => {
    expect(() => normalizeQuality({ ...command, legalPass: true, qcPass: true, reviewerUserId: "reviewer", safetyPass: false })).toThrow("cannot average");
  });

  it("requires accepted title requirements, dependencies, and evidence", () => {
    expect(() => normalizeTitle({ ...command, allRequirementsAccepted: true, evidenceObjectIds: [], externalDependencyClear: true, requirementPolicyVersion: "T1", reviewerUserId: "reviewer" })).toThrow("Every applicable");
  });

  it("requires five approved photos and reconciled publication is explicit", () => {
    const value = { ...command, channelReconciled: false, contentApproved: true, description: "Verified vehicle", factsVerified: true, listingChannels: ["INTERNAL"], mediaApproved: true, photoReferences: ["1", "2", "3", "4"], priceApproved: true, priceApprovedByUserId: "reviewer", priceCents: 1_000_000 };
    expect(() => normalizeMerchandising(value)).toThrow("five");
    expect(normalizeMerchandising({ ...value, photoReferences: ["1", "2", "3", "4", "5"] }).snapshot.publicationState).toBe("PENDING_EXTERNAL");
  });

  it("fails the release gate closed for empty snapshots", () => {
    const result = evaluateFrontlineRelease({ acquisition: {}, execution: {}, inspection: {}, merchandising: {}, quality: {}, receipt: {}, title: {} });
    expect(result.eligible).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(["ACQUISITION", "RECEIPT", "INSPECTION", "EXECUTION", "QUALITY_SAFETY", "TITLE", "MERCHANDISING", "CHANNEL_RECONCILIATION"]));
  });

  it("accepts release only when every hard gate has current evidence", () => {
    const result = evaluateFrontlineRelease({ acquisition: { acquisitionCaseId: "case-1", inventoryUnitId: "unit-1" }, execution: { repairOrderId: "ro-1", verifiedAt: now.toISOString() }, inspection: { identityConflict: false, safetyCriticalFail: false, templateComplete: true }, merchandising: { channelReconciled: true, contentApproved: true, factsVerified: true, mediaApproved: true, packageVersion: 1, priceApproved: true }, quality: { legalPass: true, qcPass: true, roadTestApplicable: true, roadTestPass: true, safetyPass: true }, receipt: { custodyAccepted: true, evidenceObjectIds: ["e-1"], identityMatch: true }, title: { id: "title-1", status: "READY" } });
    expect(result).toEqual({ eligible: true, missing: [] });
  });

  it("renders the enterprise workspace and all governed milestone labels", () => {
    const markup = renderToStaticMarkup(<InventoryFrontlineWorkspace initial={{ contractVersion: "inv-itf/1.0.0", freshness: "COMPLETE", generatedAt: now.toISOString(), items: [], totals: { active: 0, blocked: 0, frontlineReady: 0, overdue: 0 } }} options={{ units: [], users: [] }} />);
    expect(markup).toContain("Make frontline readiness provable");
    expect(markup).toContain("Shop &amp; Parts");
    expect(markup).toContain("Start from acquired inventory");
    expect(markup).toContain("adapters are disabled");
  });
});
