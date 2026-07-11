import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
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

describe("customer console read service", () => {
  it("requires an authenticated viewer", async () => {
    await expect(getCustomerDashboardReadModel(null)).rejects.toThrow("Authentication required");
    await expect(getCustomer360ReadModel(null, {})).rejects.toThrow("Authentication required");
    await expect(getCustomerResolutionReadModel(null, {})).rejects.toThrow("Authentication required");
  });

  it("returns the complete dashboard read model", async () => {
    const model = await getCustomerDashboardReadModel(manager);

    expect(model.source).toBe("PREVIEW_READ_MODEL");
    expect(model.viewerName).toBe("Eli Aswan");
    expect(model.metrics).toHaveLength(5);
    expect(model.recentLeads).toHaveLength(5);
    expect(model.topDeals).toHaveLength(5);
  });

  it.each<[CustomerResolutionQueue, number]>([
    ["all", 9],
    ["mine", 3],
    ["unassigned", 1],
    ["overdue", 2],
    ["escalated", 1],
    ["resolved", 1]
  ])("returns the %s resolution queue", async (queue, count) => {
    const model = await getCustomerResolutionReadModel(manager, { queue });

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
    });

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
