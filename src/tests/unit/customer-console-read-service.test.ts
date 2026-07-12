import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { listConcernResolutionPackages } from "@/server/services/concern-resolution-service";
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

describe("customer console read service", () => {
  it("requires an authenticated viewer", async () => {
    await expect(getCustomerDashboardReadModel(null)).rejects.toThrow("Authentication required");
    await expect(getCustomer360ReadModel(null, {})).rejects.toThrow("Authentication required");
    await expect(getCustomerResolutionReadModel(null, {})).rejects.toThrow("Authentication required");
  });

  it("returns the complete dashboard read model", async () => {
    const model = await getCustomerDashboardReadModel(manager, {
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
    expect(model.topDeals).toHaveLength(5);
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
    ["deals", "Deals"],
    ["cases", "Cases"],
    ["appointments", "Appointments"],
    ["documents", "Documents"],
    ["vehicles", "Vehicles"],
    ["communications", "Communications"],
    ["collections", "Collections"],
    ["notes", "Notes"]
  ])("returns the %s Customer 360 panel", async (tab, title) => {
    const model = await getCustomer360ReadModel(manager, { tab });

    expect(model.tab).toBe(tab);
    expect(model.panel.title).toBe(title);
    expect(model.panel.items.length).toBeGreaterThan(0);
  });
});
