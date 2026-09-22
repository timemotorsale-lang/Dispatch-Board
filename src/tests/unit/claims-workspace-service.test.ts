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
