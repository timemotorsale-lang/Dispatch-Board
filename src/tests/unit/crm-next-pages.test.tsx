import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser
}));

import CrmNextPage from "@/app/(app)/crm-next/page";
import CrmNextAppointmentsPage from "@/app/(app)/crm-next/appointments/page";
import CrmNextCustomerPage from "@/app/(app)/crm-next/customers/[customerId]/page";
import CrmNextDealsPage from "@/app/(app)/crm-next/deals/page";
import CrmNextNeedsAttentionPage from "@/app/(app)/crm-next/needs-attention/page";
import CrmNextPipelinePage from "@/app/(app)/crm-next/pipeline/page";
import CrmNextProgressPage from "@/app/(app)/crm-next/progress/page";
import CrmNextSearchPage from "@/app/(app)/crm-next/search/page";
import CrmNextPermissionReviewPage from "@/app/(app)/crm-next/system/permissions/page";
import CrmNextRollbackReviewPage from "@/app/(app)/crm-next/system/rollback/page";
import CrmNextStateReviewPage from "@/app/(app)/crm-next/system/states/page";
import CrmNextTestDrivesPage from "@/app/(app)/crm-next/test-drives/page";
import CrmNextTimelinePage from "@/app/(app)/crm-next/timeline/page";
import CrmNextWorkPage from "@/app/(app)/crm-next/work/[itemId]/page";

const originalFlag = process.env.CRM_NEXT;

function user(roles: string[]): AuthenticatedUser {
  return {
    id: `user-${roles.join("-").toLowerCase()}`,
    name: "CRM Next Page User",
    email: "crm-next-page@example.test",
    isActive: true,
    roles,
    duties: { all: [], direct: [], roleDefaults: [] }
  };
}

describe("CRM Next pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.CRM_NEXT;
    else process.env.CRM_NEXT = originalFlag;
  });

  it("fails closed when CRM_NEXT is off and preserves Legacy routes", async () => {
    process.env.CRM_NEXT = "OFF";
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const markup = renderToStaticMarkup(await CrmNextPage());

    expect(markup).toContain("CRM Next is protected right now");
    expect(markup).toContain("CRM Next is safely turned off");
    expect(markup).toContain('href="/customers"');
    expect(markup).toContain('href="/crm"');
    expect(markup).not.toContain("Who needs attention?");
  });

  it("renders the command center, attention list, customer 360, and work customer screens when enabled", async () => {
    process.env.CRM_NEXT = "REVIEW";
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const command = renderToStaticMarkup(await CrmNextPage());
    const attention = renderToStaticMarkup(await CrmNextNeedsAttentionPage());
    const customer = renderToStaticMarkup(await CrmNextCustomerPage({ params: Promise.resolve({ customerId: "michael-johnson" }) }));
    const work = renderToStaticMarkup(await CrmNextWorkPage({ params: Promise.resolve({ itemId: "attn-michael-overdue-follow-up" }) }));
    const search = renderToStaticMarkup(await CrmNextSearchPage());
    const timeline = renderToStaticMarkup(await CrmNextTimelinePage());
    const pipeline = renderToStaticMarkup(await CrmNextPipelinePage());
    const appointments = renderToStaticMarkup(await CrmNextAppointmentsPage());
    const testDrives = renderToStaticMarkup(await CrmNextTestDrivesPage());
    const deals = renderToStaticMarkup(await CrmNextDealsPage());
    const states = renderToStaticMarkup(await CrmNextStateReviewPage());
    const permissions = renderToStaticMarkup(await CrmNextPermissionReviewPage());
    const rollback = renderToStaticMarkup(await CrmNextRollbackReviewPage());
    const progress = renderToStaticMarkup(await CrmNextProgressPage());

    expect(command).toContain("Who needs attention?");
    expect(command).toContain("CRM Next Preview");
    expect(attention).toContain("Prioritized customers that need action");
    expect(customer).toContain("Customer 360 Overview");
    expect(customer).toContain("Open Legacy CRM");
    expect(work).toContain("Attend: Michael Johnson");
    expect(work).toContain("No live task is created in this slice");
    expect(search).toContain("Find the customer");
    expect(search).toContain("Deals and Opportunities");
    expect(timeline).toContain("Customer activity without source drift");
    expect(timeline).toContain("Opportunity moved to proposal review");
    expect(pipeline).toContain("Read-only pipeline board");
    expect(appointments).toContain("Appointment context from the existing workspace");
    expect(testDrives).toContain("Test-drive review surface");
    expect(deals).toContain("Deal review without mutation");
    expect(states).toContain("Clear states instead of confusing dead ends");
    expect(permissions).toContain("Denied users fail closed");
    expect(rollback).toContain("CRM Next can be turned off safely");
    expect(progress).toContain("CRM Next build cockpit");
    expect(progress).toContain("CRMN-016 → CRMN-035");
    expect(progress).toContain("CRMN-035");
    expect(progress).toContain("CRMN-036");
  });
});
