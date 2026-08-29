import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCooWorkbookDailyReportDraft: vi.fn(),
  createCooWorkbookChecklistItem: vi.fn(),
  createStaffWorkbookChecklistItem: vi.fn(),
  createStaffWorkbookDailyReportDraft: vi.fn(),
  createStaffWorkbookQuickUpdate: vi.fn(),
  getCurrentUser: vi.fn(),
  getStaffWorkbook: vi.fn(),
  getStaffWorkbookSummaries: vi.fn(),
  getServiceAdvisorWorkspace: vi.fn(),
  updateCooWorkbookReportSeed: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/advisor-workspace/service", () => ({
  getServiceAdvisorWorkspace: mocks.getServiceAdvisorWorkspace
}));

vi.mock("@/server/services/workday-workbook", () => ({
  createCooWorkbookChecklistItem: mocks.createCooWorkbookChecklistItem,
  createCooWorkbookDailyReportDraft: mocks.createCooWorkbookDailyReportDraft,
  createStaffWorkbookChecklistItem: mocks.createStaffWorkbookChecklistItem,
  createStaffWorkbookDailyReportDraft: mocks.createStaffWorkbookDailyReportDraft,
  createStaffWorkbookQuickUpdate: mocks.createStaffWorkbookQuickUpdate,
  getStaffWorkbook: mocks.getStaffWorkbook,
  getStaffWorkbookSummaries: mocks.getStaffWorkbookSummaries,
  updateCooWorkbookReportSeed: mocks.updateCooWorkbookReportSeed
}));

import { POST as POSTChecklist } from "@/app/api/coo-workbook/checklist/route";
import { POST as POSTReportDraft } from "@/app/api/coo-workbook/report-drafts/route";
import { PATCH as PATCHReportSeed } from "@/app/api/coo-workbook/report-seeds/[seedId]/route";
import { GET as GETStaffWorkbook } from "@/app/api/coo-workbook/staff/route";
import { POST as POSTStaffChecklist } from "@/app/api/coo-workbook/staff/checklist/route";
import { POST as POSTStaffQuickUpdate } from "@/app/api/coo-workbook/staff/quick-updates/route";
import { POST as POSTStaffReportDraft } from "@/app/api/coo-workbook/staff/report-drafts/route";

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
    mocks.createCooWorkbookDailyReportDraft.mockResolvedValue({ ok: true });
    mocks.createStaffWorkbookChecklistItem.mockResolvedValue({ ok: true });
    mocks.createStaffWorkbookDailyReportDraft.mockResolvedValue({ ok: true });
    mocks.createStaffWorkbookQuickUpdate.mockResolvedValue({ ok: true });
    mocks.getStaffWorkbook.mockResolvedValue({ id: "staff-workbook-1" });
    mocks.getStaffWorkbookSummaries.mockResolvedValue([{ staffName: "Alex Carter" }]);
    mocks.updateCooWorkbookReportSeed.mockResolvedValue({ ok: true });
    mocks.getServiceAdvisorWorkspace.mockResolvedValue({
      actionQueue: [
        { actionKind: "AUTHORIZATION" },
        { actionKind: "HANDOFF" }
      ],
      counts: {
        needsAttention: 2,
        waitingOnOthers: 1
      }
    });
  });

  it("creates checklist items through the protected workbook service", async () => {
    const response = await POSTChecklist(new Request("http://localhost/api/coo-workbook/checklist?date=2026-08-29", {
      method: "POST",
      body: JSON.stringify({ text: "Review daily report seeds" })
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.createCooWorkbookChecklistItem).toHaveBeenCalledWith(user, "2026-08-29", { text: "Review daily report seeds" });
  });

  it("maps validation failures to bad request", async () => {
    mocks.createCooWorkbookChecklistItem.mockRejectedValue(new Error("Checklist item text is required."));

    const response = await POSTChecklist(new Request("http://localhost/api/coo-workbook/checklist", {
      method: "POST",
      body: JSON.stringify({ text: "" })
    }));

    expect(response.status).toBe(400);
  });

  it("updates Report Seed review fields through the protected service", async () => {
    const response = await PATCHReportSeed(new Request("http://localhost/api/coo-workbook/report-seeds/seed-1", {
      method: "PATCH",
      body: JSON.stringify({ reviewNote: "Use in manager summary.", status: "INCLUDED" })
    }), { params: Promise.resolve({ seedId: "seed-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.updateCooWorkbookReportSeed).toHaveBeenCalledWith(user, "seed-1", { reviewNote: "Use in manager summary.", status: "INCLUDED" });
  });

  it("generates a Daily Report Draft with current operating counts", async () => {
    const response = await POSTReportDraft(new Request("http://localhost/api/coo-workbook/report-drafts?date=2026-08-29", {
      method: "POST"
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.createCooWorkbookDailyReportDraft).toHaveBeenCalledWith(user, "2026-08-29", {
      approvalCount: 1,
      handoffCount: 1,
      reportExceptions: 3
    });
  });

  it("loads the current user's staff workbook and manager summaries", async () => {
    const response = await GETStaffWorkbook(new Request("http://localhost/api/coo-workbook/staff?date=2026-08-29"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      staffWorkbookSummaries: [{ staffName: "Alex Carter" }],
      workbook: { id: "staff-workbook-1" }
    });
    expect(mocks.getStaffWorkbook).toHaveBeenCalledWith(user, "2026-08-29");
    expect(mocks.getStaffWorkbookSummaries).toHaveBeenCalledWith(user, "2026-08-29");
  });

  it("creates staff checklist items through the staff workbook service", async () => {
    const response = await POSTStaffChecklist(new Request("http://localhost/api/coo-workbook/staff/checklist?date=2026-08-29", {
      method: "POST",
      body: JSON.stringify({ text: "Finish daily callbacks" })
    }));

    expect(response.status).toBe(201);
    expect(mocks.createStaffWorkbookChecklistItem).toHaveBeenCalledWith(user, "2026-08-29", { text: "Finish daily callbacks" });
  });

  it("creates staff Quick Updates through the staff workbook service", async () => {
    const response = await POSTStaffQuickUpdate(new Request("http://localhost/api/coo-workbook/staff/quick-updates?date=2026-08-29", {
      method: "POST",
      body: JSON.stringify({ category: "OTHER", text: "Customer stopped by with title paperwork." })
    }));

    expect(response.status).toBe(201);
    expect(mocks.createStaffWorkbookQuickUpdate).toHaveBeenCalledWith(user, "2026-08-29", { category: "OTHER", text: "Customer stopped by with title paperwork." });
  });

  it("generates a staff Daily Report Draft", async () => {
    const response = await POSTStaffReportDraft(new Request("http://localhost/api/coo-workbook/staff/report-drafts?date=2026-08-29", {
      method: "POST"
    }));

    expect(response.status).toBe(201);
    expect(mocks.createStaffWorkbookDailyReportDraft).toHaveBeenCalledWith(user, "2026-08-29");
  });
});
