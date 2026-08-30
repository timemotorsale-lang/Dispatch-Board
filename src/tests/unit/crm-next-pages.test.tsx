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
import CrmNextCoexistencePage from "@/app/(app)/crm-next/coexistence/page";
import CrmNextCustomerPage from "@/app/(app)/crm-next/customers/[customerId]/page";
import CrmNextDealsPage from "@/app/(app)/crm-next/deals/page";
import CrmNextIntelligenceFoundationPage from "@/app/(app)/crm-next/intelligence-foundation/page";
import CrmNextHardeningPage from "@/app/(app)/crm-next/hardening/page";
import CrmNextNeedsAttentionPage from "@/app/(app)/crm-next/needs-attention/page";
import CrmNextOwnershipSupportPage from "@/app/(app)/crm-next/ownership-support/page";
import CrmNextPilotReadinessPage from "@/app/(app)/crm-next/pilot-readiness/page";
import CrmNextPilotReleasePage from "@/app/(app)/crm-next/pilot-release/page";
import CrmNextPipelinePage from "@/app/(app)/crm-next/pipeline/page";
import CrmNextProgressPage from "@/app/(app)/crm-next/progress/page";
import CrmNextSearchPage from "@/app/(app)/crm-next/search/page";
import CrmNextSharedExecutionPage from "@/app/(app)/crm-next/shared-execution/page";
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
    const ownershipSupport = renderToStaticMarkup(await CrmNextOwnershipSupportPage());
    const sharedExecution = renderToStaticMarkup(await CrmNextSharedExecutionPage());
    const intelligence = renderToStaticMarkup(await CrmNextIntelligenceFoundationPage());
    const pilot = renderToStaticMarkup(await CrmNextPilotReadinessPage());
    const hardening = renderToStaticMarkup(await CrmNextHardeningPage());
    const coexistence = renderToStaticMarkup(await CrmNextCoexistencePage());
    const pilotRelease = renderToStaticMarkup(await CrmNextPilotReleasePage());
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
    expect(command).toContain("Compact review cockpit");
    expect(command).toContain("Employee Command Center");
    expect(command).toContain("Manager Command Center");
    expect(command).toContain("Team response &amp; load indicators");
    expect(command).toContain("Pilot readiness");
    expect(command).toContain("Hardening");
    expect(command).toContain("Coexistence");
    expect(command).toContain("Pilot Release");
    expect(attention).toContain("Prioritized customers that need action");
    expect(customer).toContain("Customer 360 Overview");
    expect(customer).toContain("Open Legacy CRM");
    expect(work).toContain("Attend: Michael Johnson");
    expect(work).toContain("No live task is created in this slice");
    expect(ownershipSupport).toContain("Ownership &amp; Support");
    expect(ownershipSupport).toContain("Everything important");
    expect(ownershipSupport).toContain("BHPH / finance context");
    expect(ownershipSupport).toContain("Payment due May 20");
    expect(ownershipSupport).toContain("Common support case framework");
    expect(ownershipSupport).toContain("Insurance claim update requested");
    expect(sharedExecution).toContain("Shared execution without a second task board");
    expect(sharedExecution).toContain("CRM action → shared Dispatch task");
    expect(sharedExecution).toContain("No duplicate comment or blocker store");
    expect(sharedExecution).toContain("Manager customer-work queue");
    expect(intelligence).toContain("Recommendations that explain themselves");
    expect(intelligence).toContain("Automation");
    expect(intelligence).toContain("Human decides");
    expect(intelligence).toContain("Manager intelligence cockpit");
    expect(intelligence).toContain("No live call, text, email, or task is created");
    expect(pilot).toContain("Enough substance to review before we turn anything live");
    expect(pilot).toContain("CRMN-075 → CRMN-079 pilot scenario expansion");
    expect(pilot).toContain("Multiple customer records ready for pilot review");
    expect(pilot).toContain("Manager review scenarios are visible before controls go live");
    expect(pilot).toContain("Legacy protected");
    expect(hardening).toContain("Controls before pilot promotion");
    expect(hardening).toContain("CRMN-080 → CRMN-086 hardening packet");
    expect(hardening).toContain("Migration and reconciliation stay held");
    expect(hardening).toContain("Security, consent, and audit boundaries are explicit");
    expect(hardening).toContain("CRMN-087");
    expect(coexistence).toContain("CRM Next can be reviewed without replacing today’s CRM");
    expect(coexistence).toContain("CRMN-087 → CRMN-090 coexistence packet");
    expect(coexistence).toContain("Capability migration remains deliberate");
    expect(coexistence).toContain("Legacy retirement is not approved");
    expect(coexistence).toContain("Pilot approval");
    expect(pilotRelease).toContain("Ready for review, not ready for launch without approval");
    expect(pilotRelease).toContain("CRMN-091 → CRMN-094 pilot release packet");
    expect(pilotRelease).toContain("Promotion checklist is ready for reviewers");
    expect(pilotRelease).toContain("Pilot launch is held for leadership approval");
    expect(pilotRelease).toContain("Pilot approval");
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
    expect(progress).toContain("CRMN-016 → CRMN-094");
    expect(progress).toContain("CRMN-035");
    expect(progress).toContain("CRMN-048");
    expect(progress).toContain("CRMN-054");
    expect(progress).toContain("CRMN-067");
    expect(progress).toContain("CRMN-074");
    expect(progress).toContain("CRMN-079");
    expect(progress).toContain("CRMN-080");
    expect(progress).toContain("CRMN-086");
    expect(progress).toContain("CRMN-087");
    expect(progress).toContain("CRMN-090");
    expect(progress).toContain("CRMN-091");
    expect(progress).toContain("CRMN-094");
    expect(progress).toContain("Pilot approval");
  });
});
