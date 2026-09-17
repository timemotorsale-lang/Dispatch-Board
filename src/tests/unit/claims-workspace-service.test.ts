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

describe("claims workspace service", () => {
  it("builds the claims desk read model from governed claim workflow records", async () => {
    const model = await getClaimsDeskReadModel(actor, { repository: createInMemoryClaimsWorkspaceRepository() });

    expect(model.contractVersion).toBe("claims-workspace/v1");
    expect(model.metrics.openClaims).toBe(3);
    expect(model.claims.map((claim) => claim.claim)).toContain("MN-48291");
    expect(model.claims[0].href).toContain("/vehicles/claims-workspace?claimId=");
    expect(model.intakeForms.map((form) => form.id)).toContain("insurance-claim-intake");
  });

  it("creates a durable claim record, flags duplicates, and produces checklist/readiness guidance", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      carrierName: "State Farm",
      claimNumber: "MN-50001",
      customerName: "New Customer",
      description: "Rear bumper damage after parking lot loss.",
      lossDate: "2026-09-17",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleVin: "VIN-NEW-001",
      vehicleYear: "2018"
    }, { now: () => new Date("2026-09-17T19:00:00.000Z"), repository });

    expect(created.readModel.claim).toMatchObject({
      claimNumber: "MN-50001",
      customerName: "New Customer",
      stage: "INTAKE",
      status: "OPEN"
    });
    expect(created.readModel.primaryBlocker).toBe("Missing authorization");
    expect(created.readModel.handoff.allowed).toBe(false);
    expect(created.readModel.executionTasks.map((task) => task.title)).toContain("Get customer authorization");
    expect(created.readModel.documentPlan.map((item) => item.label)).toContain("Customer repair authorization");
    expect(created.readModel.photoPlan.map((item) => item.label)).toContain("Damage overview and closeups");
    expect(created.readModel.carrierTracker.nextContact).toBe("Call carrier for adjuster");

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
