import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  attachClaimEvidence,
  createInMemoryClaimsWorkspaceRepository,
  createInsuranceClaim,
  getClaimWorkspaceReadModel,
  getClaimsDeskReadModel,
  requestClaimHandoff,
  updateClaimExecutionDetails
} from "@/server/claims-workspace/service";

const actor: AuthenticatedUser = {
  duties: { all: [], direct: [], roleDefaults: [] },
  email: "advisor@example.com",
  id: "advisor-1",
  isActive: true,
  name: "Service Advisor",
  roles: ["Service Advisor"]
};

const manager: AuthenticatedUser = {
  ...actor,
  id: "manager-1",
  name: "Claims Manager",
  roles: ["Service Department Manager"]
};

describe("claims workspace service", () => {
  it("persists a staff-reviewed approval even without a recognized estimate and audits corrections", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, { customerName: "Approval Customer", vehicleVin: "VIN-APPROVAL" }, { repository });
    const claimId = created.readModel.claim.id;
    await updateClaimExecutionDetails(actor, claimId, { approvedRepairAmount: "4,812.44", note: "Lori approved the repairs; extraction missed the total." }, { repository });
    const refreshed = await getClaimWorkspaceReadModel(actor, claimId, { repository });
    expect(refreshed.estimateReview).toMatchObject({ approvedAmountCents: 481244, approvedAmountLabel: "$4,812.44", status: "AMOUNT_FOUND" });
    expect(refreshed.billingRecovery.summary.approvedAmountLabel).toBe("$4,812.44");
    expect(refreshed.activities).toEqual(expect.arrayContaining([expect.objectContaining({ action: "CLAIM_APPROVED_AMOUNT_RECORDED", actorUserId: actor.id, actorUserName: actor.name, detail: expect.stringContaining("Lori approved") })]));
    expect(refreshed.handoff.allowed).toBe(false);

    const evidence = await attachClaimEvidence(actor, claimId, { category: "ESTIMATE", status: "RECEIVED", title: "Updated estimate", notes: "Approved repair amount $6,000.00" }, { repository });
    expect(evidence.estimateReview.approvedAmountCents).toBe(481244);
    const source = evidence.evidence.find((item) => item.title === "Updated estimate")!;
    const corrected = await updateClaimExecutionDetails(actor, claimId, { approvedRepairAmount: "6000.00", approvalEvidenceId: source.id, note: "Reviewed and confirmed the supplement." }, { repository });
    expect(corrected.estimateReview).toMatchObject({ approvedAmountCents: 600000, evidenceId: source.id });
    expect(corrected.activities).toEqual(expect.arrayContaining([expect.objectContaining({ detail: expect.stringContaining("$4,812.44 -> $6,000.00") })]));
  });

  it.each(["", "-1", "12.345", "1,23.00", "NaN", "Infinity", "21474836.48"])("rejects an invalid manual approval amount %s", async (approvedRepairAmount) => {
    const repository = createInMemoryClaimsWorkspaceRepository();
    await expect(updateClaimExecutionDetails(actor, "claim-demo-1", { approvedRepairAmount, note: "Staff correction" }, { repository })).rejects.toMatchObject({ code: "CLAIM_INVALID" });
  });

  it("requires an approval note and rejects evidence from another claim", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository();
    await expect(updateClaimExecutionDetails(actor, "claim-demo-1", { approvedRepairAmount: "0" }, { repository })).rejects.toMatchObject({ code: "CLAIM_INVALID" });
    await expect(updateClaimExecutionDetails(actor, "claim-demo-1", { approvedRepairAmount: "100", approvalEvidenceId: "foreign-evidence", note: "Approved" }, { repository })).rejects.toMatchObject({ code: "CLAIM_INVALID" });
    const zero = await updateClaimExecutionDetails(actor, "claim-demo-1", { approvedRepairAmount: "0", note: "Carrier confirmed no payable repairs." }, { repository });
    expect(zero.estimateReview.approvedAmountLabel).toBe("$0.00");
  });

  it("builds the claims desk read model from governed claim workflow records", async () => {
    const model = await getClaimsDeskReadModel(actor, { repository: createInMemoryClaimsWorkspaceRepository() });

    expect(model.contractVersion).toBe("claims-workspace/v1");
    expect(model.metrics.openClaims).toBe(3);
    expect(model.claims.map((claim) => claim.claim)).toContain("MN-48291");
    expect(model.claims[0].href).toContain("/vehicles/claims-workspace?claimId=");
    expect(model.filters.map((filter) => filter.id)).toEqual(["all", "blocked", "waitingCarrier", "readyHandoff", "paymentWatch", "aging"]);
    expect(model.intakeForms.map((form) => form.id)).toContain("insurance-claim-intake");
    expect(model.commandCenter.scopes).toEqual(["Claims", "Vehicles", "Documents", "Money", "Tasks", "Timeline"]);
    expect(model.executionCards.map((card) => card.title)).toContain("Missing photos");
    expect(model.statusSignals.map((signal) => signal.label)).toContain("Authorization gaps");
    expect(model.guardrails.map((guardrail) => guardrail.label)).toContain("Invoice packet gate");
    expect(model.documentShortcuts.map((shortcut) => shortcut.label)).toContain("Authorizations");
    expect(model.financialExceptions.map((exception) => exception.label)).toContain("Blocked billing");
    expect(model.templates.map((template) => template.label)).toContain("Carrier adjuster call");
    expect(model.timeline.length).toBeGreaterThan(0);
  });

  it("creates a durable claim record, flags duplicates, and produces checklist/readiness guidance", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      carrierName: "State Farm",
      claimNumber: "MN-50001",
      customerAddressLine1: "1101 E Lake St",
      customerCity: "Minneapolis",
      customerName: "New Customer",
      customerPostalCode: "55407",
      customerState: "MN",
      description: "Rear bumper damage after parking lot loss.",
      lossDate: "2026-09-17",
      policyNumber: "POL-50001",
      vehicleColor: "Silver",
      vehicleMake: "Toyota",
      vehicleMileage: "104500",
      vehicleModel: "Camry",
      vehicleVin: "VIN-NEW-001",
      vehicleYear: "2018"
    }, { now: () => new Date("2026-09-17T19:00:00.000Z"), repository });

    expect(created.readModel.claim).toMatchObject({
      claimNumber: "MN-50001",
      customerAddressLine1: "1101 E Lake St",
      customerName: "New Customer",
      stage: "INTAKE",
      vehicleColor: "Silver",
      vehicleMileage: "104500",
      status: "OPEN"
    });
    expect(created.readModel.primaryBlocker).toBe("Missing authorization");
    expect(created.readModel.handoff.allowed).toBe(false);
    expect(created.readModel.executionTasks.map((task) => task.title)).toContain("Get customer authorization");
    expect(created.readModel.documentPlan.map((item) => item.label)).toContain("Customer repair authorization");
    expect(created.readModel.documentPlan.map((item) => item.label)).toContain("Rental support");
    expect(created.readModel.photoPlan.map((item) => item.label)).toContain("Damage overview and closeups");
    expect(created.readModel.carrierTracker.nextContact).toBe("Call carrier for adjuster");
    expect(created.readModel.billingRecovery).toMatchObject({
      invoicePacket: {
        ready: false,
        status: "BLOCKED"
      },
      nextAction: {
        label: "Confirm payer contact"
      },
      rental: {
        status: "NOT_STARTED"
      }
    });

    await expect(createInsuranceClaim(actor, {
      carrierName: "State Farm",
      claimNumber: "MN-50001",
      customerName: "New Customer",
      duplicateExceptionReason: "",
      vehicleVin: "VIN-NEW-002"
    }, { repository })).rejects.toMatchObject({ code: "CLAIM_INVALID" });
  });

  it("attaches evidence and allows repair handoff only after required gates pass", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    repository.findAssociatedRepairTask = async (aggregate) => aggregate.claim.claimNumber === "MN-60002"
      ? { href: "/tasks/task-repair-start", id: "task-repair-start", status: "IN_PROGRESS", title: "Start approved repairs for Ready Customer" }
      : null;
    const created = await createInsuranceClaim(actor, {
      carrierName: "Progressive",
      claimNumber: "MN-60002",
      customerName: "Ready Customer",
      description: "Left front damage.",
      lossDate: "2026-09-17",
      ownerUserId: "advisor-1",
      vehicleMake: "Nissan",
      vehicleModel: "Rogue",
      vehicleVin: "VIN-READY-001",
      vehicleYear: "2020"
    }, { repository });
    const claimId = created.readModel.claim.id;

    await expect(requestClaimHandoff(actor, claimId, {}, { repository })).rejects.toMatchObject({ code: "CLAIM_HANDOFF_BLOCKED" });

    for (const [category, title] of [
      ["AUTHORIZATION", "Signed customer authorization"],
      ["DAMAGE_PHOTO", "Damage photo set"],
      ["VIN_PHOTO", "VIN photo"],
      ["ODOMETER_PHOTO", "Odometer photo"],
      ["INSURANCE_CARD", "Insurance card"],
      ["CLAIM_IDENTITY", "Claim number"]
    ] as const) {
      await attachClaimEvidence(actor, claimId, {
        category,
        relationshipTargets: ["CLAIM", "CUSTOMER", "VEHICLE"],
        status: "RECEIVED",
        title
      }, { repository });
    }

    const ready = await getClaimWorkspaceReadModel(actor, claimId, { repository });
    expect(ready.handoff.allowed).toBe(true);
    expect(ready.primaryBlocker).toBe("Ready for repair order");
    expect(ready.executionTasks[0].title).toBe("Move to repair handoff");
    expect(ready.associatedRepairTask).toMatchObject({
      href: "/tasks/task-repair-start",
      id: "task-repair-start",
      title: "Start approved repairs for Ready Customer"
    });

    const handedOff = await requestClaimHandoff(actor, claimId, {}, { repository });
    expect(handedOff.claim.stage).toBe("REPAIR_HANDOFF");
    expect(handedOff.claim.nextAction).toBe("Open or link repair order");
  });

  it("surfaces billing recovery and rental extension work as simple next actions", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      adjusterName: "Pat Adjuster",
      carrierName: "Progressive",
      claimNumber: "MN-66002",
      customerName: "Rental Customer",
      deductible: "$500",
      description: "Left front damage.",
      ownerUserId: "advisor-1",
      vehicleVin: "VIN-RENTAL-001"
    }, { repository });
    const claimId = created.readModel.claim.id;

    for (const [category, title, notes] of [
      ["AUTHORIZATION", "Signed authorization", ""],
      ["ESTIMATE", "Carrier estimate", ""],
      ["RENTAL", "Rental agreement", "Daily rental started; approved days not captured yet."]
    ] as const) {
      await attachClaimEvidence(actor, claimId, {
        category,
        notes,
        relationshipTargets: ["CLAIM"],
        status: "RECEIVED",
        title
      }, { repository });
    }

    const model = await getClaimWorkspaceReadModel(actor, claimId, { repository });
    expect(model.billingRecovery.nextAction).toMatchObject({
      label: "Request rental extension",
      ownerRole: "Service advisor"
    });
    expect(model.billingRecovery.rental).toMatchObject({
      overageRisk: "NEEDS_EXTENSION",
      status: "EXTENSION_NEEDED"
    });
    expect(model.billingRecovery.payerSplit.some((payer) => payer.title === "Rental recovery" && payer.status === "BLOCKED")).toBe(true);
  });

  it("reads approved repair amount from carrier estimate evidence and reflects it in recovery", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      adjusterName: "Pat Adjuster",
      carrierName: "Progressive",
      claimNumber: "MN-67002",
      customerName: "Estimate Customer",
      description: "Rear body damage.",
      ownerUserId: "advisor-1",
      vehicleVin: "VIN-ESTIMATE-001"
    }, { repository });

    const model = await attachClaimEvidence(actor, created.readModel.claim.id, {
      category: "ESTIMATE",
      fileName: "progressive-estimate.pdf",
      notes: "Carrier estimate approved repair amount $4,812.44 after teardown.",
      relationshipTargets: ["CLAIM", "REPAIR_ORDER"],
      status: "RECEIVED",
      title: "Progressive approved estimate"
    }, { repository });

    expect(model.estimateReview).toMatchObject({
      approvedAmountCents: 481244,
      approvedAmountLabel: "$4,812.44",
      confidence: "HIGH",
      fileName: "progressive-estimate.pdf",
      status: "AMOUNT_FOUND"
    });
    expect(model.billingRecovery.summary.approvedAmountLabel).toBe("$4,812.44");
    expect(model.billingRecovery.payerSplit[0].amountLabel).toBe("$4,812.44");
  });

  it("does not treat vehicle years or upload dates in estimate names as approved repair amounts", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      carrierName: "Progressive",
      claimNumber: "MN-67003",
      customerName: "Filename Estimate Customer",
      description: "Front body damage.",
      ownerUserId: "advisor-1",
      vehicleVin: "VIN-ESTIMATE-002"
    }, { repository });

    const model = await attachClaimEvidence(actor, created.readModel.claim.id, {
      category: "ESTIMATE",
      fileName: "2021 Honda CR-V Gray - Estimate from Insurance.pdf",
      notes: "2021 Honda CR-V Gray - Estimate from Insurance.pdf - 9/23/2026, 8:52:31 PM",
      relationshipTargets: ["CLAIM", "REPAIR_ORDER"],
      status: "RECEIVED",
      title: "2021 Honda CR-V Gray - Estimate from Insurance.pdf"
    }, { repository });

    expect(model.estimateReview).toMatchObject({
      approvedAmountCents: null,
      approvedAmountLabel: "Estimate attached - amount review needed",
      confidence: "NEEDS_REVIEW",
      status: "REVIEW_NEEDED"
    });
  });

  it("reads approved repair amount from extracted uploaded document text", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      carrierName: "Progressive",
      claimNumber: "MN-67004",
      customerName: "Extracted Estimate Customer",
      description: "Front body damage.",
      ownerUserId: "advisor-1",
      vehicleVin: "VIN-ESTIMATE-003"
    }, { repository });

    const model = await attachClaimEvidence(actor, created.readModel.claim.id, {
      category: "ESTIMATE",
      extractedText: "Insurance estimate. Approved repair amount $6,642.31. Deductible $500.",
      fileName: "2021 Honda CR-V Gray - Estimate from Insurance.pdf",
      notes: "Uploaded from claim evidence.",
      relationshipTargets: ["CLAIM", "REPAIR_ORDER"],
      status: "RECEIVED",
      title: "2021 Honda CR-V Gray - Estimate from Insurance.pdf"
    }, { repository });

    expect(model.estimateReview).toMatchObject({
      approvedAmountCents: 664231,
      approvedAmountLabel: "$6,642.31",
      confidence: "HIGH",
      status: "AMOUNT_FOUND"
    });
    expect(model.claim).toMatchObject({
      approvedAmountCents: 664231,
      approvedAmountConfidence: "HIGH",
      approvedAmountRecordedAt: expect.any(String),
      approvedAmountSourceEvidenceId: model.estimateReview.evidenceId
    });

    const reloaded = await getClaimWorkspaceReadModel(actor, created.readModel.claim.id, { repository });
    expect(reloaded.claim.approvedAmountCents).toBe(664231);
    expect(reloaded.estimateReview.approvedAmountLabel).toBe("$6,642.31");
  });

  it("keeps multiple uploaded documents as independent claim evidence", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      claimNumber: "MN-67006",
      customerName: "Multiple Document Customer",
      ownerUserId: "advisor-1",
      vehicleVin: "VIN-MULTI-001"
    }, { repository });

    for (const [documentLibraryId, fileName, title] of [
      ["doc-estimate", "carrier-estimate.pdf", "Carrier estimate"],
      ["doc-authorization", "signed-authorization.pdf", "Signed authorization"]
    ] as const) {
      await attachClaimEvidence(actor, created.readModel.claim.id, {
        category: title.includes("estimate") ? "ESTIMATE" : "AUTHORIZATION",
        documentLibraryId,
        fileName,
        relationshipTargets: ["CLAIM"],
        status: "RECEIVED",
        title
      }, { repository });
    }

    const reloaded = await getClaimWorkspaceReadModel(actor, created.readModel.claim.id, { repository });
    expect(reloaded.evidence).toHaveLength(2);
    expect(reloaded.evidence.map((item) => item.documentLibraryId)).toEqual(["doc-estimate", "doc-authorization"]);
  });

  it("prefers estimate summary totals over OCR table row counts", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      carrierName: "Grinnell Mutual",
      claimNumber: "MN-67005",
      customerName: "OCR Estimate Customer",
      description: "Door shell estimate.",
      ownerUserId: "advisor-1",
      vehicleVin: "VIN-ESTIMATE-004"
    }, { repository });

    const model = await attachClaimEvidence(actor, created.readModel.claim.id, {
      category: "ESTIMATE",
      extractedText: [
        "Line # Description Operation Type Total Units CEG Type Number Qty Total Price Tax",
        "1 100089 L Frt Door Shell Remove Body 5.2 New 67050-TLA-A10ZZ 1 $1,816.47 Yes",
        "Parts Total Costs Amount Paint Materials $463.50",
        "Gross Totals Amount Gross Total $6,608.98",
        "Net Estimate Total"
      ].join("\n"),
      fileName: "2021 Honda CR-V Gray - Estimate from Insurance.pdf",
      notes: "Extraction note: PDF embedded text was unreadable, so OCR was used.",
      relationshipTargets: ["CLAIM", "REPAIR_ORDER"],
      status: "RECEIVED",
      title: "2021 Honda CR-V Gray - Estimate from Insurance.pdf"
    }, { repository });

    expect(model.estimateReview).toMatchObject({
      approvedAmountCents: 660898,
      approvedAmountLabel: "$6,608.98",
      status: "AMOUNT_FOUND"
    });
  });

  it("recognizes an estimate uploaded through another evidence port", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      carrierName: "AllState Insurance",
      claimNumber: "MN-68002",
      customerName: "Cross Port Customer",
      description: "Front collision estimate.",
      ownerUserId: "advisor-1",
      vehicleVin: "VIN-CROSS-PORT-001"
    }, { repository });

    const model = await attachClaimEvidence(actor, created.readModel.claim.id, {
      category: "AUTHORIZATION",
      fileName: "allstate-estimate.pdf",
      notes: "Uploaded from Extra Action Tools. Approved repair amount $6,210.75.",
      relationshipTargets: ["CLAIM"],
      status: "RECEIVED",
      title: "AllState carrier estimate"
    }, { repository });

    expect(model.evidence[0]).toMatchObject({ category: "ESTIMATE" });
    expect(model.checklist.find((item) => item.category === "ESTIMATE")).toMatchObject({ state: "RECEIVED" });
    expect(model.estimateReview.approvedAmountLabel).toBe("$6,210.75");
    expect(model.billingRecovery.summary.approvedAmountLabel).toBe("$6,210.75");
  });

  it("requires manager authority before approving a blocked repair handoff exception", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      carrierName: "Progressive",
      claimNumber: "MN-65002",
      customerName: "Exception Customer",
      description: "Vehicle needs emergency handoff.",
      ownerUserId: "advisor-1",
      vehicleVin: "VIN-EXCEPTION-001"
    }, { repository });
    const claimId = created.readModel.claim.id;

    await expect(requestClaimHandoff(actor, claimId, { exceptionReason: "Customer authorized by phone." }, { repository })).rejects.toMatchObject({ code: "CLAIM_MANAGER_APPROVAL_REQUIRED" });

    const exceptionApproved = await requestClaimHandoff(manager, claimId, { exceptionReason: "Manager approved repair handoff while odometer photo is pending." }, { repository });
    expect(exceptionApproved.claim.stage).toBe("REPAIR_HANDOFF");
    expect(exceptionApproved.claim.blockerReason).toContain("Exception approved");
    expect(exceptionApproved.activities[0]).toMatchObject({
      action: "CLAIM_HANDOFF_EXCEPTION_APPROVED"
    });
  });

  it("records carrier execution details and writes an activity trail entry", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      carrierName: "State Farm",
      claimNumber: "MN-70003",
      customerName: "Carrier Customer",
      description: "Right rear damage.",
      vehicleVin: "VIN-CARRIER-001"
    }, { repository });

    const updated = await updateClaimExecutionDetails(actor, created.readModel.claim.id, {
      adjusterEmail: "adjuster@example.com",
      adjusterName: "Alex Adjuster",
      adjusterPhone: "612-555-0199",
      note: "Carrier confirmed estimate review by tomorrow.",
      policyNumber: "POL-123"
    }, { repository });

    expect(updated.claim.adjusterName).toBe("Alex Adjuster");
    expect(updated.carrierTracker.nextContact).toBe("Request estimate or approval");
    expect(updated.activities[0]).toMatchObject({
      action: "CLAIM_EXECUTION_UPDATED",
      detail: "Carrier confirmed estimate review by tomorrow."
    });
  });
});
