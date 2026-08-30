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
import CrmNextActionPage from "@/app/(app)/crm-next/actions/[actionId]/page";
import CrmNextCoexistencePage from "@/app/(app)/crm-next/coexistence/page";
import CrmNextCustomerPage from "@/app/(app)/crm-next/customers/[customerId]/page";
import CrmNextDealsPage from "@/app/(app)/crm-next/deals/page";
import CrmNextIntelligenceFoundationPage from "@/app/(app)/crm-next/intelligence-foundation/page";
import CrmNextHardeningPage from "@/app/(app)/crm-next/hardening/page";
import CrmNextNeedsAttentionPage from "@/app/(app)/crm-next/needs-attention/page";
import CrmNextNewCustomerPage from "@/app/(app)/crm-next/new/page";
import CrmNextOwnershipSupportPage from "@/app/(app)/crm-next/ownership-support/page";
import CrmNextPilotReadinessPage from "@/app/(app)/crm-next/pilot-readiness/page";
import CrmNextPilotReleasePage from "@/app/(app)/crm-next/pilot-release/page";
import CrmNextPipelinePage from "@/app/(app)/crm-next/pipeline/page";
import CrmNextProgressPage from "@/app/(app)/crm-next/progress/page";
import CrmNextReviewCenterPage from "@/app/(app)/crm-next/review/page";
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
    const search = renderToStaticMarkup(await CrmNextSearchPage({ searchParams: Promise.resolve({}) }));
    const timeline = renderToStaticMarkup(await CrmNextTimelinePage());
    const pipeline = renderToStaticMarkup(await CrmNextPipelinePage());
    const appointments = renderToStaticMarkup(await CrmNextAppointmentsPage());
    const testDrives = renderToStaticMarkup(await CrmNextTestDrivesPage());
    const deals = renderToStaticMarkup(await CrmNextDealsPage());
    const states = renderToStaticMarkup(await CrmNextStateReviewPage());
    const permissions = renderToStaticMarkup(await CrmNextPermissionReviewPage());
    const rollback = renderToStaticMarkup(await CrmNextRollbackReviewPage());
    const progress = renderToStaticMarkup(await CrmNextProgressPage());
    const review = renderToStaticMarkup(await CrmNextReviewCenterPage());
    const logCallAction = renderToStaticMarkup(await CrmNextActionPage({ params: Promise.resolve({ actionId: "log-call" }) }));
    const newTaskAction = renderToStaticMarkup(await CrmNextActionPage({ params: Promise.resolve({ actionId: "new-task" }) }));
    const emailAction = renderToStaticMarkup(await CrmNextActionPage({ params: Promise.resolve({ actionId: "send-email" }) }));
    const newCustomer = renderToStaticMarkup(await CrmNextNewCustomerPage());

    expect(command).toContain("Who needs attention?");
    expect(command).toContain("CRM Next active");
    expect(command).toContain("Add Customer / Prospect");
    expect(command).toContain("View attention queue");
    expect(command).toContain("Work customer");
    expect(command).toContain("Open Customer 360");
    expect(command).toContain('href="/crm-next/needs-attention"');
    expect(command).toContain('href="/crm-next/appointments"');
    expect(command).toContain('href="/crm-next/deals"');
    expect(command).toContain("Customer next actions");
    expect(command).toContain("Appointment board");
    expect(command).not.toContain("Operational read status");
    expect(command).not.toContain("Review Center");
    expect(command).not.toContain("Compact review cockpit");
    expect(command).not.toContain("Employee Command Center");
    expect(command).not.toContain("Manager Command Center");
    expect(command).not.toContain("Team response &amp; load indicators");
    expect(command).not.toContain("Pilot Readiness");
    expect(command).not.toContain("Coexistence");
    expect(command).not.toContain("Pilot Release");
    expect(command).not.toContain("View progress");
    expect(command).not.toContain("CRMN-068");
    expect(command).not.toContain("Review ready");
    expect(attention).toContain("Prioritized customers that need action");
    expect(customer).toContain("Michael Johnson");
    expect(customer).toContain("Preferred Customer");
    expect(customer).toContain("Customer Since");
    expect(customer).toContain("Quick Actions");
    expect(customer).toContain('href="/crm-next/actions/log-call"');
    expect(customer).toContain('href="/crm-next/actions/send-email"');
    expect(customer).toContain('href="/crm-next/actions/new-task"');
    expect(customer).toContain('href="/crm-next/actions/new-case"');
    expect(customer).toContain('href="/crm-next/actions/schedule-appointment"');
    expect(customer).toContain('href="/crm-next/actions/upload-document"');
    expect(customer).toContain("Next Best Action");
    expect(customer).toContain("Linked Vehicles");
    expect(customer).toContain("Source status");
    expect(customer).toContain("Open Current CRM");
    expect(customer).toContain("Add Customer");
    expect(customer).toContain("Open deal board");
    expect(customer).toContain("Open appointments");
    expect(work).toContain("Attend: Michael Johnson");
    expect(work).toContain("Create Dispatch task");
    expect(work).not.toContain("Connected to the CRM Next action-to-task bridge contract");
    expect(work).not.toContain("Backend wired · writes held");
    expect(work).toContain("Call Michael Johnson");
    expect(work).toContain("Today 3:00 PM");
    expect(work).toContain('href="/crm-next/actions/log-call"');
    expect(work).toContain('href="#dispatch-task"');
    expect(search).toContain("Add Customer / Prospect");
    expect(newCustomer).toContain("Add a customer or prospect");
    expect(newCustomer).toContain("Customer details");
    expect(newCustomer).toContain("Prospect");
    expect(newCustomer).toContain("Save customer");
    expect(newCustomer).toContain("Shared customer record");
    for (const staffMarkup of [command, attention, customer, search, timeline, pipeline, appointments, testDrives, deals, ownershipSupport, sharedExecution, intelligence, work, logCallAction, newTaskAction, emailAction, newCustomer]) {
      expect(staffMarkup).not.toContain("CRMN-");
      expect(staffMarkup).not.toContain("IMPLEMENTED_UNVERIFIED");
      expect(staffMarkup).not.toContain("build cockpit");
      expect(staffMarkup).not.toContain("Backend contract");
      expect(staffMarkup).not.toContain("bridge contract");
      expect(staffMarkup).not.toContain("dogfood");
      expect(staffMarkup).not.toContain("Dogfood");
      expect(staffMarkup).not.toContain("Preview only");
      expect(staffMarkup).not.toContain("preview-only");
      expect(staffMarkup).not.toContain("source-owned");
      expect(staffMarkup).not.toContain("source drift");
    }
    expect(ownershipSupport).toContain("Ownership &amp; Support");
    expect(ownershipSupport).toContain("Everything important");
    expect(ownershipSupport).toContain("BHPH / finance context");
    expect(ownershipSupport).toContain("Payment due May 20");
    expect(ownershipSupport).toContain("Common support case framework");
    expect(ownershipSupport).toContain("Insurance claim update requested");
    expect(sharedExecution).toContain("Shared customer execution");
    expect(sharedExecution).toContain("CRM action → shared Dispatch task");
    expect(sharedExecution).toContain("Team execution");
    expect(sharedExecution).toContain("Manager customer-work queue");
    expect(intelligence).toContain("Recommendations that explain themselves");
    expect(intelligence).toContain("Automation");
    expect(intelligence).toContain("Human decides");
    expect(intelligence).toContain("Manager intelligence cockpit");
    expect(intelligence).toContain("Recommended customer actions");
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
    expect(coexistence).toContain("CRMN-150 proof bundle");
    expect(pilotRelease).toContain("Ready for review, not ready for launch without approval");
    expect(pilotRelease).toContain("CRMN-091 → CRMN-094 pilot release packet");
    expect(pilotRelease).toContain("Promotion checklist is ready for reviewers");
    expect(pilotRelease).toContain("Pilot launch is held for leadership approval");
    expect(pilotRelease).toContain("CRMN-150 proof bundle");
    expect(search).toContain("Find the customer");
    expect(search).toContain("Deals and Opportunities");
    expect(timeline).toContain("Customer activity timeline");
    expect(timeline).toContain("Opportunity moved to proposal");
    expect(pipeline).toContain("Pipeline board");
    expect(appointments).toContain("Appointments");
    expect(testDrives).toContain("Test drives");
    expect(deals).toContain("Deals in progress");
    expect(states).toContain("Clear states instead of confusing dead ends");
    expect(permissions).toContain("Denied users fail closed");
    expect(rollback).toContain("CRM Next can be turned off safely");
    expect(progress).toContain("CRM Next build cockpit");
    expect(progress).toContain("CRMN-016 → CRMN-119");
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
    expect(progress).toContain("CRMN-095");
    expect(progress).toContain("CRMN-099");
    expect(progress).toContain("CRMN-100");
    expect(progress).toContain("CRMN-119");
    expect(progress).toContain("CRMN-150 proof bundle");
    expect(progress).toContain("CRMN-122");
    expect(progress).toContain("CRMN-150");
    expect(progress).toContain("CRMN-120");
    expect(review).toContain("Hidden build-review controls");
    expect(review).toContain("Progress");
    expect(review).toContain("Pilot Readiness");
    expect(review).toContain("Hardening");
    expect(review).toContain("Coexistence");
    expect(review).toContain("Pilot Release");
    expect(review).toContain("Permissions Review");
    expect(review).toContain("Rollback Review");
    expect(review).toContain("Command Center implementation cards");
    expect(review).toContain("CRMN-068");
    expect(review).toContain("Review ready");
    expect(logCallAction).toContain("Log Call");
    expect(logCallAction).toContain("Open the call workflow");
    expect(logCallAction).toContain("What happens next");
    expect(newTaskAction).toContain("Dispatch Board task engine");
    expect(newTaskAction).toContain("Create a Dispatch task");
    expect(emailAction).toContain("Use approved workspace");
    expect(emailAction).toContain("approved email workflow");
  });
});
