import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { ConcernPackageRecord, ConcernResolutionRepository } from "@/server/repositories/concern-resolution-repository";
import { fulfillCustomerUpdatePromise } from "@/server/services/concern-resolution-service";

const owner: AuthenticatedUser = { id: "owner-1", name: "Owner", email: "owner@test", isActive: true, roles: [], duties: { direct: [], roleDefaults: [], all: [] } };
const other = { ...owner, id: "other-1" };

function packageRecord(status = "OPEN") {
  const now = new Date("2026-07-12T19:00:00.000Z");
  return { id: "case-1", concernNumber: "CON-1", title: "Title delay", description: "Customer needs an update", category: "DOCUMENTATION_TITLE", secondaryCategory: null, workflowArea: "ADMIN", riskType: "CUSTOMER_SATISFACTION", priority: "HIGH", status: "OPEN", source: "MANAGER", customerReference: "Maria Santos", vehicleReference: "Toyota Camry", dueAt: now, escalationRequired: false, escalateAt: null, templateCode: "TITLE_DELAY_V1", templateVersion: 1, closureOutcome: null, closureReason: null, resolutionProof: null, createdAt: now, updatedAt: now, severityScore: 60, severityBand: "P1", firstResponseDueAt: now, resolutionDueAt: now, assignedOwner: owner, reportedByUser: owner, taskLinks: [], customerPromises: [{ id: "promise-1", concernCaseId: "case-1", ownerUserId: owner.id, promiseType: "CUSTOMER_UPDATE", promisedAt: now, dueAt: now, status, fulfillmentNotes: status === "FULFILLED" ? "Updated customer." : null, fulfilledAt: status === "FULFILLED" ? now : null, fulfilledByUserId: status === "FULFILLED" ? owner.id : null, createdAt: now, updatedAt: now, ownerUser: owner, fulfilledByUser: status === "FULFILLED" ? owner : null }] } as unknown as ConcernPackageRecord;
}

describe("customer update promise service", () => {
  it("enforces ownership and records fulfillment evidence", async () => {
    let record = packageRecord();
    const repository = { async findCustomerPromise() { return { id: "promise-1", concernCaseId: "case-1", ownerUserId: owner.id, status: record.customerPromises[0].status, dueAt: record.customerPromises[0].dueAt }; }, async findById() { return record; }, async fulfillCustomerPromise(input: { notes: string }) { record = packageRecord("FULFILLED"); record.customerPromises[0].fulfillmentNotes = input.notes; return record; } } as ConcernResolutionRepository;
    await expect(fulfillCustomerUpdatePromise(other, "promise-1", { notes: "Updated customer by phone." }, { repository })).rejects.toThrow("permission");
    const result = await fulfillCustomerUpdatePromise(owner, "promise-1", { notes: "Updated customer by phone." }, { repository });
    expect(result.concern.promises[0]).toMatchObject({ status: "FULFILLED", fulfilledAt: "2026-07-12T19:00:00.000Z" });
  });

  it("requires fulfillment notes", async () => {
    const repository = { async findCustomerPromise() { return null; } } as ConcernResolutionRepository;
    await expect(fulfillCustomerUpdatePromise(owner, "promise-1", { notes: " " }, { repository })).rejects.toThrow("Promise fulfillment notes is required");
  });
});
