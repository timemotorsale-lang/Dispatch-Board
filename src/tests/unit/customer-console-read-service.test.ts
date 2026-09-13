import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { listConcernResolutionPackages } from "@/server/services/concern-resolution-service";
import type { Customer360Record, Customer360Repository } from "@/server/repositories/customer-360-repository";
import {
  getCustomer360ReadModel,
  getCustomerDashboardReadModel,
  getCustomerResolutionReadModel,
  type Customer360Tab,
  type CustomerResolutionDetail,
  type CustomerResolutionQueue
} from "@/server/services/customer-console-read-service";

const manager: AuthenticatedUser = {
  id: "user-manager",
  name: "Eli Aswan",
  email: "manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const durableCases = Array.from({ length: 6 }, (_, index) => {
  const settings = [
    ["IN_PROGRESS", "HIGH", manager, "2026-07-13T20:00:00.000Z"],
    ["OPEN", "MEDIUM", manager, "2026-07-13T20:00:00.000Z"],
    ["CLOSED", "LOW", manager, "2026-07-11T20:00:00.000Z"],
    ["OPEN", "MEDIUM", null, "2026-07-13T20:00:00.000Z"],
    ["ESCALATED", "CRITICAL", { id: "other", name: "Other Owner", email: "other@test" }, "2026-07-11T20:00:00.000Z"],
    ["OPEN", "HIGH", { id: "other", name: "Other Owner", email: "other@test" }, "2026-07-11T20:00:00.000Z"]
  ] as const;
  const [status, priority, owner, dueAt] = settings[index];
  return { replayed: false, concern: {
    id: `case-${index + 1}`, concernNumber: `CR-2025-0064${1 - index}`,
    title: index === 0 ? "Financing approval delay" : `Customer case ${index + 1}`,
    description: "Customer needs a documented resolution.", category: index === 0 ? "Financing" : "Customer Care",
    secondaryCategory: null, workflowArea: "SALES", riskType: "CUSTOMER_SATISFACTION", priority, status,
    source: "MANAGER", customerReference: index === 0 ? "Ahmed H." : `Customer ${index + 1}`,
    vehicleReference: "2018 Toyota Camry", dueAt, escalationRequired: status === "ESCALATED", escalateAt: null,
    templateCode: "MANAGER_REVIEW_V1", templateVersion: 1, closureOutcome: status === "CLOSED" ? "RESOLVED" : null,
    closureReason: null, resolutionProof: null, createdAt: "2026-07-10T20:00:00.000Z", updatedAt: "2026-07-12T18:00:00.000Z",
    severityScore: priority === "CRITICAL" ? 90 : 40, severityBand: priority === "CRITICAL" ? "P0" : "P2",
    firstResponseDueAt: "2026-07-12T20:00:00.000Z", resolutionDueAt: dueAt, owner,
    reportedBy: manager, promises: [{ id: `promise-${index + 1}`, type: "CUSTOMER_UPDATE", status: "OPEN", dueAt: "2026-07-12T21:00:00.000Z", fulfilledAt: null, owner: owner ?? manager }]
  }, tasks: [] };
}) as Awaited<ReturnType<typeof listConcernResolutionPackages>>;

const caseDependencies = { caseReader: async () => durableCases, now: () => new Date("2026-07-12T19:00:00.000Z") };

const customer360Record = { id: "customer-1", organizationId: "org-time-motor-sales", customerNumber: "CUS-1", displayName: "Maria Santos", phoneNumber: "6125550198", email: "maria@test", status: "ACTIVE", externalReference: null, duplicateKey: null, mergedIntoCustomerId: null, retentionUntil: null, ownerUserId: manager.id, preferredContactMethod: "PHONE", preferredContactTime: "EVENING", languageCode: "en", address: "123 Main St", sourceCode: "REFERRAL", lastInteractionAt: new Date("2026-07-12T18:00:00.000Z"), nextActionAt: new Date("2026-07-13T15:00:00.000Z"), archivedAt: null, createdAt: new Date("2024-01-01T00:00:00.000Z"), updatedAt: new Date("2026-07-12T18:00:00.000Z"), ownerUser: manager, contactPoints: [{ id: "contact-1", customerId: "customer-1", type: "PHONE", value: "6125550198", normalizedValue: "+16125550198", isPrimary: true, consentStatus: "OPTED_IN", createdAt: new Date(), updatedAt: new Date() }], interactions: [{ id: "interaction-1", customerId: "customer-1", actorUserId: manager.id, channel: "PHONE", direction: "OUTBOUND", summary: "Discussed title status.", outcome: "REACHED", nextStep: "Update tomorrow", occurredAt: new Date("2026-07-12T18:00:00.000Z"), createdAt: new Date(), actorUser: { id: manager.id, name: manager.name } }], notes: [{ id: "note-1", customerId: "customer-1", authorUserId: manager.id, body: "Prefers evening calls.", visibility: "INTERNAL", createdAt: new Date(), updatedAt: new Date(), authorUser: { id: manager.id, name: manager.name } }], leads: [], concernCases: [], tasks: [], appointmentParticipants: [], vehicleRelationships: [], documentRequirements: [], crmDecisionRecords: [] } as unknown as Customer360Record;
const customer360Repository = { async findCustomer(_organizationId: string, customerId?: string | null) { return !customerId || customerId === customer360Record.id ? customer360Record : null; } } satisfies Customer360Repository;

describe("customer console read service", () => {
  it("requires an authenticated viewer", async () => {
    await expect(getCustomerDashboardReadModel(null)).rejects.toThrow("Authentication required");
    await expect(getCustomer360ReadModel(null, {})).rejects.toThrow("Authentication required");
    await expect(getCustomerResolutionReadModel(null, {})).rejects.toThrow("Authentication required");
  });

  it("returns the complete dashboard read model", async () => {
    const model = await getCustomerDashboardReadModel(manager, {
      customerReader: async () => ({
        contractVersion: "ucrm.customer-list/v1",
        state: "READY",
        visibility: "organization",
        generatedAt: "2026-07-12T19:00:00.000Z",
        source: {
          authority: "CUSTOMERS",
          href: "/customers",
          label: "Customers",
          observedAt: "2026-07-12T19:00:00.000Z",
          readMode: "LIVE_CANONICAL"
        },
        freshness: {
          newestRecordUpdatedAt: "2026-07-12T19:30:00.000Z",
          observedAt: "2026-07-12T19:00:00.000Z",
          status: "CURRENT"
        },
        query: { owner: "all", q: "", status: "all" },
        items: [{
          id: "customer-asmaa",
          contactCompleteness: "partial",
          customerNumber: "CUS-ASMAA",
          displayName: "Asmaa Mohamed Salah",
          duplicateRisk: false,
          hasNextAction: false,
          lastInteractionAt: null,
          maskedEmail: "a•••@e•••.com",
          maskedPhone: "••••3073",
          nextActionAt: null,
          ownerName: "Eli Aswan",
          preferredContactMethod: null,
          sourceCode: "WALK_IN",
          sourceHref: "/customers/customer-asmaa",
          status: "active",
          updatedAt: "2026-07-12T19:30:00.000Z"
        }],
        page: { hasMore: false, limit: 12, nextCursor: null }
      }),
      leadReader: async () => Array.from({ length: 5 }, (_, index) => ({
        id: `lead-${index + 1}`,
        leadNumber: `LEAD-${index + 1}`,
        customer: { id: `customer-${index + 1}`, customerNumber: `CUS-${index + 1}`, displayName: `Customer ${index + 1}`, phoneNumber: null, email: null },
        owner: { id: "user-sales", name: "Sales User", email: "sales@local.test" },
        sourceCode: "WEBSITE",
        stage: "NEW",
        vehicleInterest: "Toyota Camry",
        nextActionCode: "FOLLOW_UP_LEAD",
        nextActionAt: "2026-07-12T20:00:00.000Z",
        priority: "P2",
        score: 70,
        confidence: "HIGH",
        task: null,
        createdAt: "2026-07-12T19:00:00.000Z",
        updatedAt: "2026-07-12T19:00:00.000Z"
      }))
    });

    expect(model.source).toBe("HYBRID_READ_MODEL");
    expect(model.viewerName).toBe("Eli Aswan");
    expect(model.metrics).toHaveLength(5);
    expect(model.recentLeads).toHaveLength(5);
    expect(model.recentLeads[0]).toMatchObject({
      href: "/crm-next/customers/customer-asmaa",
      name: "Asmaa Mohamed Salah",
      source: "Walk In"
    });
    expect(model.activity[0]).toMatchObject({
      detail: "Customer 1 via Website",
      href: "/crm-next/customers/customer-1",
      title: "New lead received"
    });
    expect(model.topDeals).toHaveLength(0);
    expect(model.metrics.find((metric) => metric.label === "Open Deals")).toMatchObject({
      sourceStatus: "Not wired",
      value: "No source data available"
    });
  });

  it.each<[CustomerResolutionQueue, number]>([
    ["all", 6],
    ["mine", 3],
    ["unassigned", 1],
    ["overdue", 2],
    ["escalated", 1],
    ["resolved", 1]
  ])("returns the %s resolution queue", async (queue, count) => {
    const model = await getCustomerResolutionReadModel(manager, { queue }, caseDependencies);

    expect(model.queue).toBe(queue);
    expect(model.cases).toHaveLength(count);
  });

  it.each<[CustomerResolutionDetail, string]>([
    ["details", "Case Details"],
    ["timeline", "Case Timeline"],
    ["customer", "Customer Context"],
    ["vehicle", "Vehicle Context"],
    ["related", "Related Work"]
  ])("returns the %s resolution detail panel", async (detail, title) => {
    const model = await getCustomerResolutionReadModel(manager, {
      caseId: "CR-2025-00641",
      detail
    }, caseDependencies);

    expect(model.detail).toBe(detail);
    expect(model.detailPanel.title).toBe(title);
    expect(model.detailPanel.sections.length).toBeGreaterThan(0);
  });

  it.each<[Customer360Tab, string]>([
    ["overview", "Customer Overview"],
    ["timeline", "Timeline"],
    ["deals", "Leads and Deals"],
    ["cases", "Cases"],
    ["appointments", "Appointments"],
    ["documents", "Documents"],
    ["vehicles", "Vehicles"],
    ["communications", "Communications"],
    ["collections", "Collections"],
    ["notes", "Notes"]
  ])("returns the %s Customer 360 panel", async (tab, title) => {
    const model = await getCustomer360ReadModel(manager, { tab, customerId: "customer-1" }, { repository: customer360Repository });

    expect(model.tab).toBe(tab);
    expect(model.panel.title).toBe(title);
    expect(Array.isArray(model.panel.items)).toBe(true);
  });

  it("restricts customer contact details for a non-owner", async () => {
    const viewer = { ...manager, id: "staff-2", roles: [] };
    const model = await getCustomer360ReadModel(viewer, { customerId: "customer-1", tab: "communications" }, { repository: customer360Repository });
    expect(model.customer.phone).toBe("Restricted");
    expect(model.panel.items[0]).toMatchObject({ detail: "Restricted" });
  });

  it("assembles durable lead, task, and case context into Customer 360", async () => {
    const now = new Date("2026-07-12T19:00:00.000Z");
    const record = { ...customer360Record,
      leads: [{ id: "lead-1", leadNumber: "LEAD-1", sourceCode: "WEBSITE", stage: "ENGAGED", vehicleInterest: "Toyota Camry", nextActionAt: now, score: 82, createdAt: now, ownerUser: { id: "sales-1", name: "Sales User" } }],
      tasks: [{ id: "task-1", title: "Call customer", status: "NOT_STARTED", dueAt: now, assignedUser: { id: "sales-1", name: "Sales User" } }],
      concernCases: [{ id: "case-1", concernNumber: "CON-1", title: "Title delay", status: "OPEN", severityBand: "P1", slaStage: "AT_RISK", dueAt: now, resolutionDueAt: now, createdAt: now, assignedOwner: { id: manager.id, name: manager.name }, customerPromises: [] }]
    } as unknown as Customer360Record;
    const repository = { async findCustomer() { return record; } } satisfies Customer360Repository;
    const model = await getCustomer360ReadModel(manager, { customerId: "customer-1", tab: "overview" }, { repository });
    expect(model.summary).toMatchObject({ openLeads: 1, openCases: 1, openTasks: 1, highestLeadScore: 82, slaRisk: "Medium" });
    expect(model.panel.items.map((entry) => entry.title)).toEqual(expect.arrayContaining(["Call customer", "Title delay"]));
  });
});
