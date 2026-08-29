import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCooWorkbookChecklistItem: vi.fn(),
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/workday-workbook", () => ({
  createCooWorkbookChecklistItem: mocks.createCooWorkbookChecklistItem
}));

import { POST } from "@/app/api/coo-workbook/checklist/route";

const user = {
  id: "user-manager",
  name: "Abdi Farah",
  email: "manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

describe("COO workbook checklist route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.createCooWorkbookChecklistItem.mockResolvedValue({ ok: true });
  });

  it("creates checklist items through the protected workbook service", async () => {
    const response = await POST(new Request("http://localhost/api/coo-workbook/checklist?date=2026-08-29", {
      method: "POST",
      body: JSON.stringify({ text: "Review daily report seeds" })
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.createCooWorkbookChecklistItem).toHaveBeenCalledWith(user, "2026-08-29", { text: "Review daily report seeds" });
  });

  it("maps validation failures to bad request", async () => {
    mocks.createCooWorkbookChecklistItem.mockRejectedValue(new Error("Checklist item text is required."));

    const response = await POST(new Request("http://localhost/api/coo-workbook/checklist", {
      method: "POST",
      body: JSON.stringify({ text: "" })
    }));

    expect(response.status).toBe(400);
  });
});
