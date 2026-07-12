import { CustomerLeadStage } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { CreateLeadPackageInput, CustomerLeadRecord, CustomerLeadRepository } from "@/server/repositories/customer-lead-repository";
import { createCustomerLead, transitionCustomerLead } from "@/server/services/customer-lead-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const salesperson: AuthenticatedUser = { id: "sales-1", name: "Sales Person", email: "sales@test", isActive: true, roles: ["Sales"], duties: { direct: [], roleDefaults: [], all: [] } };

function harness() {
  const leads: CustomerLeadRecord[] = [];
  const repository: CustomerLeadRepository = {
    async findCustomer(organizationId, customerId) { return organizationId === "org-1" && customerId === "customer-1" ? { id: customerId, displayName: "Maria Santos" } : null; },
    async findByIdempotency(organizationId, key) { return leads.find((lead) => lead.organizationId === organizationId && lead.idempotencyKey === key) ?? null; },
    async findById(organizationId, id) { return leads.find((lead) => lead.organizationId === organizationId && lead.id === id) ?? null; },
    async listAssignmentCandidates() { return [{ id: salesperson.id, name: salesperson.name, isActive: true, userRoles: [{ role: { name: "Sales" } }], userDuties: [], _count: { ownedCustomerLeads: 0 } }]; },
    async createPackage(input: CreateLeadPackageInput) {
      const now = input.decidedAt;
      const lead = {
        id: "lead-1", organizationId: input.organizationId, customerId: input.customerId,
        leadNumber: input.leadNumber, idempotencyKey: input.idempotencyKey, requestHash: input.requestHash,
        sourceCode: input.sourceCode, stage: CustomerLeadStage.NEW,
        ownerUserId: input.assignmentDecision.recommendedOwnerId!, vehicleInterest: input.vehicleInterest,
        nextActionCode: input.priorityDecision.recommendedActionCode!, nextActionAt: new Date(input.priorityDecision.dueAt!),
        priority: input.priorityDecision.priority!, score: input.priorityDecision.score!, confidence: input.priorityDecision.confidence,
        lastDecisionId: "decision-1", qualificationSnapshot: input.qualificationSnapshot,
        closedReason: null, closedAt: null, createdByUserId: input.createdByUserId, createdAt: now, updatedAt: now,
        customer: { id: "customer-1", customerNumber: "CUS-1", displayName: "Maria Santos", phoneNumber: "6125550100", email: null },
        ownerUser: { id: salesperson.id, name: salesperson.name, email: salesperson.email },
        taskLinks: [{ id: "link-1", leadId: "lead-1", taskId: "task-1", actionCode: input.priorityDecision.recommendedActionCode!, decisionId: "decision-1", createdAt: now, task: { id: "task-1", title: "Lead follow-up: Maria Santos", status: "NOT_STARTED", dueAt: new Date(input.priorityDecision.dueAt!) } }]
      } as unknown as CustomerLeadRecord;
      leads.push(lead); return lead;
    },
    async transition(input) {
      const lead = leads.find((item) => item.id === input.id)!; lead.stage = input.stage;
      lead.closedReason = input.reason; lead.closedAt = [CustomerLeadStage.WON, CustomerLeadStage.LOST].includes(input.stage) ? input.occurredAt : null;
      return lead;
    },
    async listRecent(_organizationId, limit) { return leads.slice(0, limit); }
  };
  return { leads, repository };
}

const intake = { idempotencyKey: "marketplace-message-1", customerId: "customer-1", sourceCode: "Facebook Marketplace", vehicleInterest: "2018 Toyota Camry", qualification: { purchaseTimeframeDays: 7, engagementLevel: "TWO_WAY", appointmentIntent: true, vehicleFit: "AVAILABLE", financingOrTradeReadiness: "PARTIAL", reachableContactCount: 1 } };

describe("customer lead service", () => {
  it("creates prioritized, assigned, actionable work and safely replays idempotency", async () => {
    const { leads, repository } = harness(); const dependencies = { repository, organizationId: "org-1", now: () => new Date("2026-07-12T19:00:00.000Z") };
    const created = await createCustomerLead(manager, intake, dependencies);
    expect(created).toMatchObject({ replayed: false, lead: { id: "lead-1", owner: { id: salesperson.id }, priority: "P1", task: { id: "task-1" } } });
    expect(leads).toHaveLength(1);
    const replay = await createCustomerLead(manager, intake, dependencies);
    expect(replay.replayed).toBe(true); expect(leads).toHaveLength(1);
  });

  it("rejects conflicting reuse of an idempotency key", async () => {
    const { repository } = harness(); const dependencies = { repository, organizationId: "org-1", now: () => new Date("2026-07-12T19:00:00.000Z") };
    await createCustomerLead(manager, intake, dependencies);
    await expect(createCustomerLead(manager, { ...intake, sourceCode: "Website" }, dependencies)).rejects.toThrow("different input");
  });

  it("enforces ownership, allowed transitions, and closure reasons", async () => {
    const { repository } = harness(); const dependencies = { repository, organizationId: "org-1", now: () => new Date("2026-07-12T19:00:00.000Z") };
    await createCustomerLead(manager, intake, dependencies);
    const other = { ...salesperson, id: "sales-2" };
    await expect(transitionCustomerLead(other, "lead-1", { stage: "ENGAGED" }, dependencies)).rejects.toThrow("permission");
    await expect(transitionCustomerLead(salesperson, "lead-1", { stage: "WON" }, dependencies)).rejects.toThrow("cannot transition");
    await transitionCustomerLead(salesperson, "lead-1", { stage: "ENGAGED" }, dependencies);
    await transitionCustomerLead(salesperson, "lead-1", { stage: "QUALIFIED" }, dependencies);
    await transitionCustomerLead(salesperson, "lead-1", { stage: "NEGOTIATION" }, dependencies);
    await expect(transitionCustomerLead(salesperson, "lead-1", { stage: "WON" }, dependencies)).rejects.toThrow("outcome reason");
    await expect(transitionCustomerLead(salesperson, "lead-1", { stage: "WON", reason: "Customer completed purchase." }, dependencies)).resolves.toMatchObject({ lead: { stage: "WON" } });
  });
});
