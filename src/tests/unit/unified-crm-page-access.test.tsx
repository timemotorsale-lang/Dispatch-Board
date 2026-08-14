import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  getUnifiedCrmCustomerList: vi.fn(),
  getUnifiedCrmOpportunityPipelinePreview: vi.fn(),
  getUnifiedCrmWorkQueue: vi.fn(),
  requireCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser
}));

vi.mock("@/server/services/unified-crm-customer-read-service", () => ({
  getUnifiedCrmCustomerList: mocks.getUnifiedCrmCustomerList
}));

vi.mock("@/server/services/unified-crm-opportunity-read-service", () => ({
  getUnifiedCrmOpportunityPipelinePreview: mocks.getUnifiedCrmOpportunityPipelinePreview
}));

vi.mock("@/server/services/unified-crm-work-queue-service", () => ({
  getUnifiedCrmWorkQueue: mocks.getUnifiedCrmWorkQueue
}));

import CrmPage from "@/app/(app)/crm/page";
import { isRoutePermittedForUser } from "@/server/auth/navigation";

const originalShellMode = process.env.UNIFIED_CRM_SHELL_MODE;

function user(roles: string[]): AuthenticatedUser {
  return {
    id: `user-${roles.join("-").toLowerCase()}`,
    name: "CRM Page User",
    email: "crm-page@example.test",
    isActive: true,
    roles,
    duties: { direct: [], roleDefaults: [], all: [] }
  };
}

async function renderPage(view?: string) {
  return renderToStaticMarkup(
    await CrmPage({ searchParams: Promise.resolve(view ? { view } : {}) })
  );
}

describe("Unified CRM page access and fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UNIFIED_CRM_SHELL_MODE = "REVIEW";
    mocks.getUnifiedCrmCustomerList.mockResolvedValue({
      contractVersion: "ucrm.customer-list/v1",
      state: "READY",
      visibility: "organization",
      generatedAt: "2026-08-14T15:00:00.000Z",
      source: { authority: "CUSTOMERS", label: "Customers", href: "/customers", readMode: "LIVE_CANONICAL", observedAt: "2026-08-14T15:00:00.000Z" },
      freshness: { status: "CURRENT", observedAt: "2026-08-14T15:00:00.000Z", newestRecordUpdatedAt: "2026-08-14T14:45:00.000Z" },
      query: { owner: "all", q: "", status: "active" },
      items: [{ id: "customer-1", displayName: "Real Customer", customerNumber: "CUS-1", maskedPhone: "••••1234", maskedEmail: "r•••@e•••.com", ownerName: "CRM Page User", status: "active", lastInteractionAt: null, nextActionAt: null, updatedAt: "2026-08-14T14:45:00.000Z", sourceHref: "/customers/customer-1" }],
      page: { hasMore: false, limit: 25, nextCursor: null }
    });
    mocks.getUnifiedCrmWorkQueue.mockResolvedValue({
      contractVersion: "ucrm.work-queue/v1",
      state: "READY",
      visibility: "organization",
      generatedAt: "2026-08-14T15:00:00.000Z",
      source: { authority: "UNIFIED_CRM", label: "CRM Work", href: "/crm?view=work", readMode: "LIVE_AGGREGATED", observedAt: "2026-08-14T15:00:00.000Z" },
      freshness: { status: "CURRENT", observedAt: "2026-08-14T15:00:00.000Z", newestRecordUpdatedAt: "2026-08-14T14:45:00.000Z" },
      summary: { totalCount: 1, overdueCount: 1, todayCount: 0, waitingCount: 0, appointmentCount: 0 },
      items: [{ id: "task-1", kind: "task", title: "Call promised buyer", customerLabel: "Real Customer · CUS-1", ownerName: "CRM Page User", sourceLabel: "Tasks", sourceHref: "/tasks/task-1", primaryActionLabel: "Open task", dueAt: "2026-08-14T14:00:00.000Z", dueLabel: "Overdue", dueState: "overdue", stageLabel: "In Progress", reason: "This assigned task is past due.", history: ["Status: In Progress"], updatedAt: "2026-08-14T14:45:00.000Z" }],
      today: []
    });
    mocks.getUnifiedCrmOpportunityPipelinePreview.mockResolvedValue({
      contractVersion: "ucrm.opportunity-read/v1",
      generatedAt: "2026-08-14T15:00:00.000Z",
      state: "PREVIEW",
      visibility: "organization",
      cards: [{ id: "foundation", label: "Foundation", value: "Ready", detail: "Detail", tone: "ready" }],
      columns: [{
        id: "intake",
        label: "Intake review",
        itemCountLabel: "2 scenarios",
        valueLabel: "No governed stage yet",
        items: [{
          id: "review01",
          customerLabel: "Preview customer",
          detailHref: "/crm/opportunities/review01?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
          nextActionLabel: "Review create contract",
          ownerLabel: "Team-owned preview",
          reason: "Preview reason"
        }]
      }],
      constraints: ["No opportunity record is created in this preview."],
      listPreview: {
        heading: "What the first live list will surface",
        emptyMessage: "No live opportunities are shown while lifecycle rules are held.",
        items: [{ id: "row1", title: "Customer and owner at a glance", ownerLabel: "Organization visibility", reason: "Preview row reason" }]
      }
    });
  });

  afterEach(() => {
    if (originalShellMode === undefined) delete process.env.UNIFIED_CRM_SHELL_MODE;
    else process.env.UNIFIED_CRM_SHELL_MODE = originalShellMode;
  });

  it("renders only the safe role fallback for an ineligible authenticated user", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["Mechanic"]));

    const markup = await renderPage();

    expect(markup).toContain("Experience review is not available");
    expect(markup).toContain("not enabled for your current workspace");
    expect(markup).toContain('href="/my-tasks"');
    expect(markup).not.toContain("Do this next");
    expect(markup).not.toContain("synthetic scenarios");
    expect(mocks.getUnifiedCrmWorkQueue).not.toHaveBeenCalled();
    expect(mocks.getUnifiedCrmOpportunityPipelinePreview).not.toHaveBeenCalled();
  });

  it("fails explicit feature-off closed with the existing manager workspace fallback", async () => {
    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const markup = await renderPage("pipeline");

    expect(markup).toContain("Unified CRM is turned off");
    expect(markup).toContain('href="/manager-workspace"');
    expect(markup).not.toContain("How the first opportunity board will feel");
    expect(markup).not.toContain("Do this next");
    expect(mocks.getUnifiedCrmWorkQueue).not.toHaveBeenCalled();
    expect(mocks.getUnifiedCrmOpportunityPipelinePreview).not.toHaveBeenCalled();
  });

  it("uses the unchanged Sales landing when a seller is outside the active shell", async () => {
    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    const salesperson = user(["Salesperson"]);
    mocks.requireCurrentUser.mockResolvedValue(salesperson);

    const markup = await renderPage();

    expect(markup).toContain('href="/tasks?department=SALES"');
    expect(isRoutePermittedForUser(salesperson, "/customers")).toBe(true);
    expect(isRoutePermittedForUser(salesperson, "/sales")).toBe(true);
  });

  it("simulates rollback from REVIEW to OFF without removing existing console routes", async () => {
    const manager = user(["General Manager"]);
    mocks.requireCurrentUser.mockResolvedValue(manager);

    const reviewMarkup = await renderPage();
    expect(reviewMarkup).toContain("Call promised buyer");

    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    const rolledBackMarkup = await renderPage();

    expect(rolledBackMarkup).toContain("Experience review is not available");
    expect(rolledBackMarkup).toContain('href="/manager-workspace"');
    expect(rolledBackMarkup).not.toContain("Do this next");
    expect(isRoutePermittedForUser(manager, "/customers")).toBe(true);
    expect(isRoutePermittedForUser(manager, "/sales")).toBe(true);
  });

  it("loads the real work queue for Home and does not serialize customer list data there", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const markup = await renderPage();

    expect(mocks.getUnifiedCrmWorkQueue).toHaveBeenCalled();
    expect(mocks.getUnifiedCrmCustomerList).not.toHaveBeenCalled();
    expect(mocks.getUnifiedCrmOpportunityPipelinePreview).not.toHaveBeenCalled();
    expect(markup).toContain("Live read-only CRM work queue");
    expect(markup).toContain("Call promised buyer");
    expect(markup).not.toContain("Search review scenarios");
  });

  it("does not read or serialize customer data when the shell is OFF on the Customers URL", async () => {
    process.env.UNIFIED_CRM_SHELL_MODE = "OFF";
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));
    mocks.getUnifiedCrmCustomerList.mockResolvedValue({
      items: [{ displayName: "MUST NOT BE SERIALIZED", maskedPhone: "••••9999" }]
    });

    const markup = await renderPage("customers");

    expect(mocks.getUnifiedCrmCustomerList).not.toHaveBeenCalled();
    expect(markup).toContain("Unified CRM is turned off");
    expect(markup).not.toContain("MUST NOT BE SERIALIZED");
    expect(markup).not.toContain("••••9999");
    expect(markup).not.toContain("Search customers");
  });

  it("loads the held opportunity review only for the Pipeline view", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const markup = await renderPage("pipeline");

    expect(mocks.getUnifiedCrmOpportunityPipelinePreview).toHaveBeenCalled();
    expect(mocks.getUnifiedCrmWorkQueue).not.toHaveBeenCalled();
    expect(mocks.getUnifiedCrmCustomerList).not.toHaveBeenCalled();
    expect(markup).toContain("How the first opportunity board will feel");
    expect(markup).toContain("Review create contract");
  });

  it("loads the real customer list only for the Customers view and forwards safe list query fields", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const markup = renderToStaticMarkup(await CrmPage({ searchParams: Promise.resolve({ view: "customers", q: "Morgan", status: "active", owner: "mine" }) }));

    expect(mocks.getUnifiedCrmCustomerList).toHaveBeenCalledWith(expect.anything(), { cursor: undefined, owner: "mine", q: "Morgan", status: "active" });
    expect(markup).toContain("Live read-only customer list");
    expect(markup).toContain("Real Customer");
    expect(markup).not.toContain("Search review scenarios");
    expect(markup).not.toContain(">New<");
  });

  it("renders an honest no-data error without echoing an invalid customer query", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));
    mocks.getUnifiedCrmCustomerList.mockRejectedValue(Object.assign(new Error("secret-query must be 100 characters or fewer"), { code: "INVALID_CUSTOMER_QUERY" }));

    const markup = renderToStaticMarkup(await CrmPage({ searchParams: Promise.resolve({ view: "customers", q: "secret-query" }) }));

    expect(markup).toContain("customer list could not be loaded safely");
    expect(markup).toContain("No customer data was displayed");
    expect(markup).not.toContain("secret-query");
    expect(markup).not.toContain("Real Customer");
  });

  it("keeps owner-only actors on their meaningful customer scope", async () => {
    mocks.requireCurrentUser.mockResolvedValue(user(["Salesperson"]));
    mocks.getUnifiedCrmCustomerList.mockResolvedValueOnce({
      visibility: "owned",
      query: { owner: "mine", q: "", status: "active" }
    });

    await CrmPage({ searchParams: Promise.resolve({ view: "customers", owner: "unassigned" }) });

    expect(mocks.getUnifiedCrmCustomerList).toHaveBeenLastCalledWith(expect.anything(), { cursor: undefined, owner: "mine", q: undefined, status: undefined });
  });
});
