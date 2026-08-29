import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCooWorkbookChecklistItem: vi.fn(),
  createCooWorkbookDailyFocusItem: vi.fn(),
  createCooWorkbookReportDraft: vi.fn(),
  createStaffSupportAction: vi.fn(),
  createStaffWorkbookChecklistItem: vi.fn(),
  createStaffWorkbookDailyFocusItem: vi.fn(),
  createStaffWorkbookQuickUpdate: vi.fn(),
  createStaffWorkbookReportDraft: vi.fn(),
  closeWorkbookDay: vi.fn(),
  getCurrentUser: vi.fn(),
  getStaffWorkbook: vi.fn(),
  getStaffWorkbookSummaries: vi.fn(),
  getServiceAdvisorWorkspace: vi.fn(),
  prepareWorkbookCarryovers: vi.fn(),
  recordWorkbookAttentionHeartbeat: vi.fn(),
  reopenWorkbookDay: vi.fn(),
  updateCooWorkbookReportSeed: vi.fn(),
  updateWorkbookDailyFocusItem: vi.fn(),
  updateStaffSupportAction: vi.fn(),
  updateWorkbookCarryover: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/advisor-workspace/service", () => ({
  getServiceAdvisorWorkspace: mocks.getServiceAdvisorWorkspace
}));

vi.mock("@/server/services/workday-workbook", () => ({
  closeWorkbookDay: mocks.closeWorkbookDay,
  createCooWorkbookChecklistItem: mocks.createCooWorkbookChecklistItem,
  createCooWorkbookDailyFocusItem: mocks.createCooWorkbookDailyFocusItem,
  createCooWorkbookReportDraft: mocks.createCooWorkbookReportDraft,
  createStaffSupportAction: mocks.createStaffSupportAction,
  createStaffWorkbookChecklistItem: mocks.createStaffWorkbookChecklistItem,
  createStaffWorkbookDailyFocusItem: mocks.createStaffWorkbookDailyFocusItem,
  createStaffWorkbookQuickUpdate: mocks.createStaffWorkbookQuickUpdate,
  createStaffWorkbookReportDraft: mocks.createStaffWorkbookReportDraft,
  getStaffWorkbook: mocks.getStaffWorkbook,
  getStaffWorkbookSummaries: mocks.getStaffWorkbookSummaries,
  prepareWorkbookCarryovers: mocks.prepareWorkbookCarryovers,
  recordWorkbookAttentionHeartbeat: mocks.recordWorkbookAttentionHeartbeat,
  reopenWorkbookDay: mocks.reopenWorkbookDay,
  updateCooWorkbookReportSeed: mocks.updateCooWorkbookReportSeed,
  updateWorkbookDailyFocusItem: mocks.updateWorkbookDailyFocusItem,
  updateStaffSupportAction: mocks.updateStaffSupportAction,
  updateWorkbookCarryover: mocks.updateWorkbookCarryover
}));

import { POST as POSTChecklist } from "@/app/api/coo-workbook/checklist/route";
import { POST as POSTClose } from "@/app/api/coo-workbook/close/route";
import { POST as POSTCarryovers } from "@/app/api/coo-workbook/carryovers/route";
import { POST as POSTAttention } from "@/app/api/coo-workbook/attention/route";
import { PATCH as PATCHCarryover } from "@/app/api/coo-workbook/carryovers/[carryoverId]/route";
import { POST as POSTDailyFocus } from "@/app/api/coo-workbook/daily-focus/route";
import { PATCH as PATCHDailyFocus } from "@/app/api/coo-workbook/daily-focus/[itemId]/route";
import { POST as POSTReportDraft } from "@/app/api/coo-workbook/report-drafts/route";
import { PATCH as PATCHReportSeed } from "@/app/api/coo-workbook/report-seeds/[seedId]/route";
import { POST as POSTReopen } from "@/app/api/coo-workbook/reopen/route";
import { GET as GETStaffWorkbook } from "@/app/api/coo-workbook/staff/route";
import { POST as POSTStaffChecklist } from "@/app/api/coo-workbook/staff/checklist/route";
import { POST as POSTStaffQuickUpdate } from "@/app/api/coo-workbook/staff/quick-updates/route";
import { POST as POSTStaffReportDraft } from "@/app/api/coo-workbook/staff/report-drafts/route";
import { POST as POSTStaffSupport } from "@/app/api/coo-workbook/staff-support/route";
import { PATCH as PATCHStaffSupport } from "@/app/api/coo-workbook/staff-support/[actionId]/route";

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
    mocks.closeWorkbookDay.mockResolvedValue({ ok: true });
    mocks.createCooWorkbookChecklistItem.mockResolvedValue({ ok: true });
    mocks.createCooWorkbookDailyFocusItem.mockResolvedValue({ ok: true });
    mocks.createCooWorkbookReportDraft.mockResolvedValue({ ok: true });
    mocks.createStaffSupportAction.mockResolvedValue({ ok: true });
    mocks.createStaffWorkbookChecklistItem.mockResolvedValue({ ok: true });
    mocks.createStaffWorkbookDailyFocusItem.mockResolvedValue({ ok: true });
    mocks.createStaffWorkbookQuickUpdate.mockResolvedValue({ ok: true });
    mocks.createStaffWorkbookReportDraft.mockResolvedValue({ ok: true });
    mocks.getStaffWorkbook.mockResolvedValue({ id: "staff-workbook-1" });
    mocks.getStaffWorkbookSummaries.mockResolvedValue([{ staffName: "Alex Carter" }]);
    mocks.prepareWorkbookCarryovers.mockResolvedValue({ count: 2, ok: true, targetBoardDate: "2026-08-30" });
    mocks.recordWorkbookAttentionHeartbeat.mockResolvedValue({ ok: true });
    mocks.reopenWorkbookDay.mockResolvedValue({ ok: true });
    mocks.updateCooWorkbookReportSeed.mockResolvedValue({ ok: true });
    mocks.updateWorkbookDailyFocusItem.mockResolvedValue({ ok: true });
    mocks.updateStaffSupportAction.mockResolvedValue({ ok: true });
    mocks.updateWorkbookCarryover.mockResolvedValue({ ok: true });
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
    expect(mocks.createCooWorkbookReportDraft).toHaveBeenCalledWith(user, "2026-08-29", "DAILY", {
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

  it("creates and updates Daily Focus items through protected workbook services", async () => {
    const createResponse = await POSTDailyFocus(new Request("http://localhost/api/coo-workbook/daily-focus?date=2026-08-29&scope=STAFF", {
      method: "POST",
      body: JSON.stringify({ outcome: "Finish top three callbacks", priority: "HIGH", riskLevel: "NONE" })
    }));
    const updateResponse = await PATCHDailyFocus(new Request("http://localhost/api/coo-workbook/daily-focus/focus-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "DONE" })
    }), { params: Promise.resolve({ itemId: "focus-1" }) });

    expect(createResponse.status).toBe(201);
    expect(updateResponse.status).toBe(200);
    expect(mocks.createStaffWorkbookDailyFocusItem).toHaveBeenCalledWith(user, "2026-08-29", { outcome: "Finish top three callbacks", priority: "HIGH", riskLevel: "NONE" });
    expect(mocks.updateWorkbookDailyFocusItem).toHaveBeenCalledWith(user, "focus-1", { status: "DONE" });
  });

  it("routes Daily Focus progress updates to the workbook service", async () => {
    const response = await PATCHDailyFocus(new Request("http://localhost/api/coo-workbook/daily-focus/focus-1", {
      method: "PATCH",
      body: JSON.stringify({ progressUpdate: "Customer callback completed." })
    }), { params: Promise.resolve({ itemId: "focus-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.updateWorkbookDailyFocusItem).toHaveBeenCalledWith(user, "focus-1", { progressUpdate: "Customer callback completed." });
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
    expect(mocks.createStaffWorkbookReportDraft).toHaveBeenCalledWith(user, "2026-08-29", "DAILY");
  });

  it("prepares carryover items for the selected workbook scope", async () => {
    const response = await POSTCarryovers(new Request("http://localhost/api/coo-workbook/carryovers?date=2026-08-29&scope=STAFF", {
      method: "POST"
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ count: 2, ok: true, targetBoardDate: "2026-08-30" });
    expect(mocks.prepareWorkbookCarryovers).toHaveBeenCalledWith(user, "2026-08-29", "STAFF");
  });

  it("records workbook attention heartbeats through the protected service", async () => {
    const payload = {
      activeSeconds: 45,
      idleSeconds: 0,
      sessionKey: "session-1",
      sourceArea: "COO_WORKBOOK_EFFECTIVENESS",
      sourcePath: "/vehicles/coo-workbook/effectiveness-pilot",
      workbookId: "workbook-1"
    };
    const response = await POSTAttention(new Request("http://localhost/api/coo-workbook/attention", {
      method: "POST",
      body: JSON.stringify(payload)
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.recordWorkbookAttentionHeartbeat).toHaveBeenCalledWith(user, payload);
  });

  it("updates carryover review state", async () => {
    const response = await PATCHCarryover(new Request("http://localhost/api/coo-workbook/carryovers/carryover-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "CONFIRMED" })
    }), { params: Promise.resolve({ carryoverId: "carryover-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.updateWorkbookCarryover).toHaveBeenCalledWith(user, "carryover-1", { status: "CONFIRMED" });
  });

  it("closes and reopens workbook days", async () => {
    const closeResponse = await POSTClose(new Request("http://localhost/api/coo-workbook/close?date=2026-08-29&scope=COO", {
      method: "POST"
    }));
    const reopenResponse = await POSTReopen(new Request("http://localhost/api/coo-workbook/reopen", {
      method: "POST",
      body: JSON.stringify({ workbookId: "workbook-1" })
    }));

    expect(closeResponse.status).toBe(201);
    expect(reopenResponse.status).toBe(201);
    expect(mocks.closeWorkbookDay).toHaveBeenCalledWith(user, "2026-08-29", "COO");
    expect(mocks.reopenWorkbookDay).toHaveBeenCalledWith(user, "workbook-1");
  });

  it("creates and updates staff support actions", async () => {
    const createResponse = await POSTStaffSupport(new Request("http://localhost/api/coo-workbook/staff-support?workbookId=staff-workbook-1", {
      method: "POST",
      body: JSON.stringify({ note: "Please add the callback result.", requestedUpdate: true })
    }));
    const updateResponse = await PATCHStaffSupport(new Request("http://localhost/api/coo-workbook/staff-support/support-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED" })
    }), { params: Promise.resolve({ actionId: "support-1" }) });

    expect(createResponse.status).toBe(201);
    expect(updateResponse.status).toBe(200);
    expect(mocks.createStaffSupportAction).toHaveBeenCalledWith(user, "staff-workbook-1", { note: "Please add the callback result.", requestedUpdate: true });
    expect(mocks.updateStaffSupportAction).toHaveBeenCalledWith(user, "support-1", { status: "RESOLVED" });
  });
});
