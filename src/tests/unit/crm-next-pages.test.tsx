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
import CrmNextCustomersPage from "@/app/(app)/crm-next/customers/page";
import CrmNextDealStartPage from "@/app/(app)/crm-next/deals/start/page";
import CrmNextDealsPage from "@/app/(app)/crm-next/deals/page";
import CrmNextIntelligenceFoundationPage from "@/app/(app)/crm-next/intelligence-foundation/page";
import CrmNextHardeningPage from "@/app/(app)/crm-next/hardening/page";
import CrmNextLeadSourceReportPage from "@/app/(app)/crm-next/reports/lead-sources/page";
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
import { applyCustomerPrefillToTestDriveFacts } from "@/features/crm-next/crm-next-deal-start-tool";
import { CrmNextActionReadinessView, CrmNextCommandCenterView, CrmNextCustomer360View, CrmNextCustomersListView, CrmNextNeedsAttentionView, CrmNextSearchView, CrmNextTimelineView, CrmNextWorkCustomerView } from "@/features/crm-next/crm-next-shell";
import { CRM_STAFF_FACING_BANNED_TERMS } from "@/lib/crm-staff-language";
import type { CrmNextActionBridgePreview } from "@/server/crm-next/action-bridge";
import type { CrmNextAttentionItem, CrmNextCommandCenter, CrmNextCustomer360, CrmNextOperatingAction, CrmNextTimelineEvent } from "@/server/crm-next/read-model";

const originalFlag = process.env.CRM_NEXT;

function user(roles: string[]): AuthenticatedUser {
  return {
    id: `user-${roles.join("-").toLowerCase()}`,
    name: "Customer Console Page User",
    email: "crm-next-page@example.test",
    isActive: true,
    roles,
    duties: { all: [], direct: [], roleDefaults: [] }
  };
}

function installLocalStorageWindow() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => store.delete(key),
      setItem: (key: string, value: string) => store.set(key, value)
    },
    location: { assign: vi.fn() },
    setTimeout: globalThis.setTimeout
  });
}

describe("CRM Next pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined") window.localStorage.clear();
  });

  afterEach(() => {
    if (typeof window !== "undefined") window.localStorage.clear();
    vi.unstubAllGlobals();
    if (originalFlag === undefined) delete process.env.CRM_NEXT;
    else process.env.CRM_NEXT = originalFlag;
  });

  it("fails closed when CRM_NEXT is off and preserves fallback routes", async () => {
    process.env.CRM_NEXT = "OFF";
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const markup = renderToStaticMarkup(await CrmNextPage());

    expect(markup).toContain("Customer Console is protected right now");
    expect(markup).toContain("Customer Console is safely turned off");
    expect(markup).toContain("Customer Archive");
    expect(markup).toContain("Older Customer Tools");
    expect(markup).toContain('href="/customers"');
    expect(markup).toContain('href="/crm"');
    expect(markup).not.toContain('href="/crm-next"');
    expect(markup).not.toContain("Who needs attention?");
  });

  it("renders the command center, attention list, customer 360, and work customer screens when enabled", async () => {
    process.env.CRM_NEXT = "REVIEW";
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const command = renderToStaticMarkup(await CrmNextPage());
    const attention = renderToStaticMarkup(await CrmNextNeedsAttentionPage());
    const customer = renderToStaticMarkup(await CrmNextCustomerPage({ params: Promise.resolve({ customerId: "michael-johnson" }) }));
    const work = renderToStaticMarkup(await CrmNextWorkPage({ params: Promise.resolve({ itemId: "attn-michael-overdue-follow-up" }) }));
    const deliveryWork = renderToStaticMarkup(await CrmNextWorkPage({
      params: Promise.resolve({ itemId: "attn-michael-overdue-follow-up" }),
      searchParams: Promise.resolve({ workPath: "delivery-transport" })
    }));
    const ownershipSupport = renderToStaticMarkup(await CrmNextOwnershipSupportPage());
    const sharedExecution = renderToStaticMarkup(await CrmNextSharedExecutionPage());
    const intelligence = renderToStaticMarkup(await CrmNextIntelligenceFoundationPage());
    const leadSourceReport = renderToStaticMarkup(await CrmNextLeadSourceReportPage());
    const pilot = renderToStaticMarkup(await CrmNextPilotReadinessPage());
    const hardening = renderToStaticMarkup(await CrmNextHardeningPage());
    const coexistence = renderToStaticMarkup(await CrmNextCoexistencePage());
    const pilotRelease = renderToStaticMarkup(await CrmNextPilotReleasePage());
    const customersList = renderToStaticMarkup(await CrmNextCustomersPage());
    const search = renderToStaticMarkup(await CrmNextSearchPage({ searchParams: Promise.resolve({}) }));
    const noteSearch = renderToStaticMarkup(await CrmNextSearchPage({ searchParams: Promise.resolve({ returnAction: "add-note" }) }));
    const timeline = renderToStaticMarkup(await CrmNextTimelinePage({ searchParams: Promise.resolve({}) }));
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
    const caseAction = renderToStaticMarkup(await CrmNextActionPage({ params: Promise.resolve({ actionId: "new-case" }), searchParams: Promise.resolve({ customerId: "michael-johnson" }) }));
    const uploadAction = renderToStaticMarkup(await CrmNextActionPage({ params: Promise.resolve({ actionId: "upload-document" }), searchParams: Promise.resolve({ customerId: "michael-johnson" }) }));
    const newCustomer = renderToStaticMarkup(await CrmNextNewCustomerPage());

    expect(command).toContain("Who needs attention?");
    expect(command).toContain("Customer Console active");
    expect(command).toContain("Customers console");
    expect(command).toContain('href="/customers"');
    expect(command).toContain("Add Customer / Prospect");
    expect(command).toContain("View attention queue");
    expect(command).toContain("Work customer");
    expect(command).toContain("Open Customer 360");
    expect(command).toContain('href="/crm-next/needs-attention"');
    expect(command).toContain('href="/crm-next/appointments"');
    expect(command).toContain('href="/appointments"');
    expect(command).toContain('href="/crm-next/deals"');
    expect(command).toContain("Customer next actions");
    expect(command).toContain("Appointment board");
    expect(command).toContain("Recommended by system");
    expect(command).toContain("Report readiness");
    expect(command).toContain("Outside-party blockers");
    expect(command).toContain("Admin guardrails");
    expect(command).toContain("Minnesota DMV");
    expect(command).toContain("Follow-up due");
    expect(command).toContain("Confirm whether the title packet is ready or needs correction.");
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
    expect(customer).toContain("Customer record unavailable");
    expect(customer).toContain("No source data available");
    expect(customer).toContain("Customer Since");
    expect(customer).toContain("Customer journey");
    expect(customer).toContain("Work the customer from first contact to outcome.");
    expect(customer).toContain("Check-In");
    expect(customer).toContain("Choose why this customer or vendor is here.");
    expect(customer).toContain("Work category");
    expect(customer).toContain("Retail sale / purchase");
    expect(customer).toContain("Vehicle delivery / transport");
    expect(customer).toContain("Start Sales / Deal");
    expect(customer).toContain("workPath=sales-deal");
    expect(customer).toContain("category=retail-sale");
    expect(customer).toContain("Customer Operating Ledger");
    expect(customer).toContain("One record for status, next action, timeline, exceptions, and closeout.");
    expect(customer).toContain("Identity type");
    expect(customer).toContain("Next owner");
    expect(customer).toContain("Due / SLA");
    expect(customer).toContain("Unified Timeline");
    expect(customer).toContain("Closeout Framework");
    expect(customer).toContain("Duplicates &amp; Relationships");
    expect(customer).toContain("Role Views");
    expect(customer).toContain("Search Coverage");
    expect(customer).toContain("Audit &amp; Manager Exceptions");
    expect(customer).toContain("Quick Actions");
    expect(customer).toContain('href="/crm-next/actions/log-call?customerId=michael-johnson"');
    expect(customer).toContain('href="/crm-next/actions/send-email?customerId=michael-johnson"');
    expect(customer).toContain('href="/crm-next/actions/new-task?customerId=michael-johnson"');
    expect(customer).toContain('href="/crm-next/actions/add-note?customerId=michael-johnson"');
    expect(customer).toContain('href="/crm-next/actions/new-case?customerId=michael-johnson"');
    expect(customer).toContain('href="/sales?workspace=guided&amp;customerId=michael-johnson');
    expect(customer).toContain("Sales Workbench");
    expect(customer).toContain('href="/appointments?action=new&amp;customerReference=Customer+record+unavailable');
    expect(customer).toContain("crmCustomerId=michael-johnson");
    expect(customer).toContain('href="/crm-next/actions/upload-document?customerId=michael-johnson"');
    expect(customer).toContain("Next Best Action");
    expect(customer).toContain("Linked Vehicles");
    expect(customer).toContain("Source status");
    expect(customer).toContain("Open older customer tools");
    expect(customer).toContain("Add Customer");
    expect(customer).toContain("Open deal board");
    expect(customer).toContain("Schedule appointment");
    expect(customer).toContain("Outside-party blockers");
    expect(customer).toContain("Warranty company");
    expect(work).toContain("Customer record unavailable");
    expect(work).toContain("Customer file");
    expect(work).toContain("Execution funnel");
    expect(work).toContain("What has happened, what is missing, and what to do next");
    expect(work).toContain("General Issue");
    expect(work).toContain("Work Path");
    expect(work).toContain("Path");
    expect(work).toContain("Status");
    expect(work).toContain("Issue");
    expect(work).toContain("Update issue");
    expect(work).toContain("Resolve issue");
    expect(work).toContain("Close the work cleanly");
    expect(work).toContain("Check-In");
    expect(work).toContain("<button");
    expect(work).toContain("Update Status");
    expect(work).toContain("Phone Call");
    expect(work).toContain("Send SMS");
    expect(work).toContain("Schedule Appt");
    expect(work).toContain('href="/appointments?action=new&amp;customerReference=Customer+record+unavailable');
    expect(work).toContain("returnTo=%2Fcrm-next%2Fneeds-attention");
    expect(work).not.toContain("Not wired yet");
    expect(work).not.toContain("Open appointment console");
    expect(work).not.toContain("will connect here once the live communication provider is ready");
    expect(work).toContain("Lead");
    expect(work).toContain("Credit App");
    expect(work).toContain("Journal Entries");
    expect(work).toContain("Logs");
    expect(work).toContain("File upload");
    expect(work).toContain("Attach customer files to this workbench");
    expect(work).toContain("Choose files");
    expect(work).toContain("Open document workflow");
    expect(work).toContain('href="/crm-next/actions/upload-document?customerId=attn-michael-overdue-follow-up"');
    expect(work).toContain("Next Appt.");
    expect(work).toContain("Last Contacted");
    expect(work).toContain("Days Since Activity");
    expect(work).toContain("Lead Source");
    expect(work).toContain("Walk-in / customer next action");
    expect(work).toContain("Activity");
    expect(work).toContain("Notes");
    expect(work).toContain("Phone");
    expect(work).toContain("Tasks");
    expect(work).toContain("Inline CRM action composer");
    expect(work).toContain("Add CRM Task");
    expect(work).toContain("Add Note");
    expect(work).toContain("Record outcome note");
    expect(work).toContain('aria-pressed="true"');
    expect(work).toContain("<button");
    expect(work).toContain("Reviewed");
    expect(work).toContain("Waiting");
    expect(work).toContain("Resolved");
    expect(work).toContain("Closed");
    expect(work).toContain("No Action Needed");
    expect(work).not.toContain("Missed Appt.");
    expect(work).not.toContain("Visit Follow-up");
    expect(work).not.toContain("Save CRM Task");
    expect(work).not.toContain("Keep it on Michael Johnson");
    expect(work).not.toContain("Dispatch handoff");
    expect(work).not.toContain("Connected to the CRM Next action-to-task bridge contract");
    expect(work).not.toContain("Backend wired · writes held");
    expect(work).toContain("Open Customer 360 from a verified customer record.");
    expect(work).toContain("No recorded activity yet");
    expect(work).toContain("There are no verified notes, calls, appointments, tasks, or updates recorded for Customer record unavailable yet.");
    expect(work).not.toContain('href="#customer-activity"');
    expect(work).not.toContain("Customer follow-up task open");
    expect(work).not.toContain("before creating any outside handoff");
    expect(work).toContain('href="#lead"');
    expect(work).not.toContain('href="/crm-next/actions/log-call?customerId=michael-johnson"');
    expect(work).not.toContain('href="/crm-next/actions/send-text?customerId=michael-johnson"');
    expect(work).not.toContain('href="/crm-next/actions/send-email?customerId=michael-johnson"');
    expect(work).not.toContain('href="/crm-next/actions/schedule-appointment?customerId=michael-johnson"');
    expect(work).not.toContain('href="/crm-next/actions/new-task?customerId=michael-johnson"');
    expect(work).not.toContain('href="#dispatch-task"');
    expect(work).not.toContain("Choose the next customer action");
    expect(work).not.toContain("Resolve the customer issue");
    expect(deliveryWork).toContain("Delivery / Transport");
    expect(deliveryWork).toContain("Record delivery");
    expect(deliveryWork).toContain("Complete delivery");
    expect(deliveryWork).toContain("Delivered");
    expect(deliveryWork).toContain("No Action Needed");
    expect(deliveryWork).not.toContain("Start deal");
    expect(search).toContain("Add Customer / Prospect");
    expect(search).toContain("No verified Customer 360 records are visible here yet");
    expect(search).toContain("Open Customer Archive");
    expect(search).toContain('href="/customers"');
    expect(customersList).toContain("Customer List");
    expect(customersList).toContain('href="/crm-next/customers#customer-list"');
    expect(customersList).toContain('id="customer-list"');
    expect(customersList).toContain("0 visible");
    expect(customersList).toContain("Customer tools");
    expect(customersList).toContain("Add, search, review attention, or open pipeline without narrowing the list.");
    expect(customersList).toContain("Open leads and pipeline");
    expect(customersList).toContain("No verified Customer 360 records are visible here yet");
    expect(customersList).toContain("Open older customer tools");
    expect(newCustomer).toContain("Add a customer or prospect");
    expect(newCustomer).toContain("Customer details");
    expect(newCustomer).toContain("Detailed customer intake");
    expect(newCustomer).toContain("Buyer Info");
    expect(newCustomer).toContain("Customer type");
    expect(newCustomer).toContain("Lead and assignment");
    expect(newCustomer).toContain("Work category");
    expect(newCustomer).toContain("Vehicle delivery / transport");
    expect(newCustomer).toContain("Customer issue / complaint");
    expect(newCustomer).toContain("Interested Vehicle");
    expect(newCustomer).toContain("Customer Wishlist");
    expect(newCustomer).toContain("Referrer");
    expect(newCustomer).toContain("Employment");
    expect(newCustomer).toContain("Campaign");
    expect(newCustomer).toContain("Capture Hub");
    expect(newCustomer).toContain("Use the phone camera to start the right work");
    expect(newCustomer).toContain("Add vehicle");
    expect(newCustomer).toContain("Repair proof");
    expect(newCustomer).toContain("Capture approval");
    expect(newCustomer).toContain("No sensitive photo is saved in this review build.");
    expect(newCustomer).toContain("Use this customer info");
    expect(newCustomer).toContain("Prospect");
    expect(newCustomer).toContain("Save customer");
    expect(newCustomer).toContain("Shared customer record");
    for (const staffMarkup of [command, attention, customer, search, timeline, pipeline, appointments, testDrives, deals, ownershipSupport, sharedExecution, intelligence, leadSourceReport, work, logCallAction, newTaskAction, emailAction, uploadAction, newCustomer]) {
      expect(staffMarkup).toContain("Customers console");
      expect(staffMarkup).toContain('href="/customers"');
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
      for (const term of CRM_STAFF_FACING_BANNED_TERMS) {
        expect(staffMarkup).not.toContain(term);
      }
    }
    expect(ownershipSupport).toContain("Ownership &amp; Support");
    expect(ownershipSupport).toContain("Everything important");
    expect(ownershipSupport).toContain("BHPH / finance context");
    expect(ownershipSupport).toContain("Payment status unavailable");
    expect(ownershipSupport).toContain("Common support case framework");
    expect(ownershipSupport).toContain("Insurance claim status unavailable");
    expect(sharedExecution).toContain("Shared customer execution");
    expect(sharedExecution).toContain("CRM task → Dispatch handoff only when needed");
    expect(sharedExecution).toContain("Team execution");
    expect(sharedExecution).toContain("Manager customer-work queue");
    expect(intelligence).toContain("Recommendations that explain themselves");
    expect(intelligence).toContain("Lead source performance report");
    expect(intelligence).toContain("Source");
    expect(intelligence).toContain("Contacted");
    expect(intelligence).toContain("Leak");
    expect(intelligence).toContain("Work these first");
    expect(intelligence).toContain("Classify");
    expect(intelligence).toContain("Measure");
    expect(intelligence).toContain("Diagnose");
    expect(intelligence).toContain("Act");
    expect(intelligence).toContain("Automation");
    expect(intelligence).toContain("Human decides");
    expect(intelligence).toContain("Manager intelligence cockpit");
    expect(intelligence).toContain("Recommended customer actions");
    expect(leadSourceReport).toContain("Lead Source Performance");
    expect(leadSourceReport).toContain("See which lead sources are creating real work");
    expect(leadSourceReport).toContain("Lead source performance report");
    expect(leadSourceReport).toContain("Work these first");
    expect(leadSourceReport).toContain("Open pipeline");
    expect(pilot).toContain("Enough substance to review before we turn anything live");
    expect(pilot).toContain("CRMN-075 → CRMN-079 pilot scenario expansion");
    expect(pilot).toContain("Multiple customer records ready for pilot review");
    expect(pilot).toContain("Manager review scenarios are visible before controls go live");
    expect(pilot).toContain("Fallback protected");
    expect(hardening).toContain("Controls before pilot promotion");
    expect(hardening).toContain("CRMN-080 → CRMN-086 hardening packet");
    expect(hardening).toContain("Migration and reconciliation stay held");
    expect(hardening).toContain("Security, consent, and audit boundaries are explicit");
    expect(hardening).toContain("CRMN-087");
    expect(coexistence).toContain("Customer Console can be reviewed without replacing today’s CRM");
    expect(coexistence).toContain("CRMN-087 → CRMN-090 coexistence packet");
    expect(coexistence).toContain("Capability migration remains deliberate");
    expect(coexistence).toContain("Fallback retirement is not approved");
    expect(coexistence).toContain("CRMN-150 proof bundle");
    expect(pilotRelease).toContain("Ready for review, not ready for launch without approval");
    expect(pilotRelease).toContain("CRMN-091 → CRMN-094 pilot release packet");
    expect(pilotRelease).toContain("Promotion checklist is ready for reviewers");
    expect(pilotRelease).toContain("Pilot launch is held for leadership approval");
    expect(pilotRelease).toContain("CRMN-150 proof bundle");
    expect(search).toContain("Find the customer");
    expect(search).toContain("Deals and Opportunities");
    expect(noteSearch).toContain("Find the customer, then continue Add Note");
    expect(noteSearch).toContain("Continue Add Note");
    expect(noteSearch).toContain("/crm-next/new?returnAction=add-note");
    expect(noteSearch).toContain('name="returnAction"');
    expect(timeline).toContain("Customer activity timeline");
    expect(timeline).toContain("No recorded activity yet");
    expect(timeline).not.toContain("Opportunity moved to proposal");
    expect(pipeline).toContain("Pipeline board");
    expect(appointments).toContain("Appointments");
    expect(testDrives).toContain("Test drives");
    expect(deals).toContain("Saved deals library");
    expect(deals).toContain("Deal status filter");
    expect(deals).not.toContain("No source data available");
    expect(states).toContain("Clear states instead of confusing dead ends");
    expect(permissions).toContain("Denied users fail closed");
    expect(rollback).toContain("Customer Console can be turned off safely");
    expect(progress).toContain("Customer Console build cockpit");
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
    expect(logCallAction).toContain("Log customer call");
    expect(logCallAction).toContain("Phone logging is not wired yet");
    expect(logCallAction).toContain("What happens next");
    expect(newTaskAction).toContain("CRM customer task list");
    expect(newTaskAction).toContain("Create a CRM task");
    expect(newTaskAction).toContain("Save CRM Task");
    expect(newTaskAction).toContain("Keep this task in the customer CRM record");
    expect(emailAction).toContain("Use the approved workspace");
    expect(emailAction).toContain("Send customer email");
    expect(emailAction).toContain("approved email workflow");
    expect(caseAction).toContain("Create customer case");
    expect(caseAction).toContain("Reminder");
    expect(caseAction).toContain("Escalation trigger");
    expect(caseAction).toContain("Customer note");
    expect(caseAction).toContain("Resolution needed");
    expect(caseAction).toContain("Case reminder and escalation controls");
    expect(caseAction).toContain("Open appointment link");
    expect(caseAction).toContain("Preview CRM task");
    expect(caseAction).toContain("Open staff queue");
    expect(caseAction).toContain("Open escalation queue");
    expect(caseAction).toContain("Notification control");
    expect(caseAction).toContain("Add customer note");
    expect(caseAction).toContain("Tag staff in note");
    expect(caseAction).toContain("/crm-next/actions/add-note");
    expect(caseAction).toContain("crm-case");
    expect(caseAction).toContain("Case+reminder+%2F+SLA+follow-up");
    expect(caseAction).toContain("Manager review is triggered");
    expect(caseAction).toContain('data-success-message="Case prepared for Customer record unavailable');
    expect(uploadAction).toContain("Upload customer document");
    expect(uploadAction).toContain("Document Library");
    expect(uploadAction).toContain("Saving a note does not upload a file.");
    expect(uploadAction).toContain("Select a verified customer before uploading documents.");
    expect(uploadAction).not.toContain('type="file"');
  });

  it("renders the executable revenue desk without staff review workflow language", async () => {
    process.env.CRM_NEXT = "REVIEW";
    mocks.requireCurrentUser.mockResolvedValue(user(["General Manager"]));

    const markup = renderToStaticMarkup(await CrmNextDealStartPage());

    expect(markup).toContain("Work the revenue path");
    expect(markup).toContain("Start Deal presets");
    expect(markup).toContain("Retail Cash / One Pay");
    expect(markup).toContain("Retail Outside Finance");
    expect(markup).toContain("Retail Dealer Finance");
    expect(markup).toContain("Choose the common path first");
    expect(markup).toContain("Enterprise deal controls");
    expect(markup).toContain("Deal packet rules engine");
    expect(markup).toContain("Packet readiness score");
    expect(markup).toContain("Unified deal jacket");
    expect(markup).toContain("Conditional manager approval");
    expect(markup).toContain("Customer-facing packet preview");
    expect(markup).toContain("Form template governance");
    expect(markup).toContain("Versioned records");
    expect(markup).toContain("Deal jacket + Library");
    expect(markup).toContain("Finance");
    expect(markup).toContain("BHPH");
    expect(markup).toContain("Retail Sale");
    expect(markup).toContain("Lease-to-Own");
    expect(markup).toContain("Test Drive");
    expect(markup).toContain("Daily Rental");
    expect(markup).toContain("Selected path");
    expect(markup).toContain("Retail Cash / One Pay");
    expect(markup).toContain("Open selected desk");
    expect(markup).toContain("First required facts");
    expect(markup).toContain("Retail sale packet");
    expect(markup).toContain("Execution Summary");
    expect(markup).toContain("Identity");
    expect(markup).toContain("Delivery");
    expect(markup).toContain("Open execution path");
    expect(markup).not.toContain("Applicant info");
    expect(markup).not.toContain("Trade-in info");
    expect(markup).not.toContain("Deal info");
    expect(markup).not.toContain("Open MN sale packet");
    expect(markup).toContain("Save draft");
    expect(markup).toContain("Saved deal drafts");
    expect(markup).not.toContain("Complete intake");
    expect(markup).not.toContain("Review shell");
    expect(markup).not.toContain("review mode");
  });

  it("prefills test-drive driver details from the selected customer record", () => {
    const facts = applyCustomerPrefillToTestDriveFacts(
      { driverEmail: "", driverLicense: "", driverPhone: "", licenseState: "MN" },
      { email: "gada@example.test", idLast4: "4321", idState: "WI", phoneNumber: "+16123580677" }
    );

    expect(facts).toEqual({
      driverEmail: "gada@example.test",
      driverLicense: "ID on file ending 4321",
      driverPhone: "+16123580677",
      licenseState: "WI",
    });
  });

  it("keeps the selected customer attached when opening an action", () => {
    const action: CrmNextOperatingAction = {
      auditPosture: "Audit the task creation request.",
      category: "Task",
      href: "/crm-next/actions/new-task",
      id: "new-task",
      label: "Create CRM Task",
      pilotRequirement: "Task creation scope approved.",
      response: "Create a CRM task that stays attached to this customer record.",
      sourceAuthority: "CRM customer task list",
      state: "PREVIEW_ONLY"
    };
    const selectedCustomer: CrmNextCustomer360 = {
      address: "Address available in Customers",
      communications: [],
      customerSince: "2026-09-09",
      email: "ainanshe@example.test",
      glance: [],
      id: "ainanshe-bashir",
      lifetimeValue: "Open customer record",
      name: "Ainanshe Bashir",
      openCases: 0,
      openDeals: 0,
      phone: "555-3073",
      riskLevel: "Low",
      status: "Active",
      nextAction: "Review customer relationship",
      vehicles: [],
      vehiclesOwned: 0
    };
    const defaultCustomer: CrmNextCustomer360 = {
      ...selectedCustomer,
      id: "ibrahim-adam",
      name: "Ibrahim Adam"
    };
    const model = {
      attention: [],
      customers: [defaultCustomer, selectedCustomer],
      operatingActions: [action],
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const markup = renderToStaticMarkup(<CrmNextActionReadinessView action={action} customerId={selectedCustomer.id} model={model} />);

    expect(markup).toContain("Ainanshe Bashir");
    expect(markup).not.toContain("Ibrahim Adam");
    expect(markup).toContain('href="/crm-next/actions/new-task?customerId=ainanshe-bashir"');
    expect(markup).toContain("Create CRM task");
    expect(markup).toContain("Review customer relationship");
    expect(markup).toContain('data-success-message="CRM task saved for Ainanshe Bashir');
  });

  it("does not fall back to another customer when an action receives an unknown customer id", () => {
    const action: CrmNextOperatingAction = {
      auditPosture: "Audit the task creation request.",
      category: "Task",
      href: "/crm-next/actions/new-task",
      id: "new-task",
      label: "Create CRM Task",
      pilotRequirement: "Task creation scope approved.",
      response: "Create a CRM task that stays attached to this customer record.",
      sourceAuthority: "CRM customer task list",
      state: "PREVIEW_ONLY"
    };
    const defaultCustomer: CrmNextCustomer360 = {
      address: "Address available in Customers",
      communications: [],
      customerSince: "2026-09-09",
      email: "max@example.test",
      glance: [],
      id: "max-auto-transport",
      lifetimeValue: "Open customer record",
      name: "Max Auto Transport",
      openCases: 0,
      openDeals: 0,
      phone: "555-1111",
      riskLevel: "Low",
      status: "Active",
      nextAction: "Review customer relationship",
      vehicles: [],
      vehiclesOwned: 0
    };
    const model = {
      attention: [],
      customers: [defaultCustomer],
      operatingActions: [action],
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const markup = renderToStaticMarkup(<CrmNextActionReadinessView action={action} customerId="john-smith" model={model} />);

    expect(markup).toContain("Customer record unavailable");
    expect(markup).toContain("Needs customer context");
    expect(markup).toContain("Find verified customer");
    expect(markup).not.toContain("Max Auto Transport");
    expect(markup).not.toContain("customerId=max-auto-transport");
  });

  it("does not show seeded activity details as customer-specific workbench activity", () => {
    const item: CrmNextAttentionItem = {
      area: "Sales",
      customerHref: "/crm-next/customers/wil-johns",
      customerId: "wil-johns",
      customerName: "Wil Johns",
      id: "attn-wil-johns",
      level: "Medium",
      nextAction: "Review next customer action",
      owner: "Eli Manager",
      reason: "Customer record needs review",
      workHref: "/crm-next/work/attn-wil-johns"
    };
    const timeline: CrmNextTimelineEvent[] = [
      {
        detail: "Michael Johnson has an active vehicle upgrade opportunity.",
        href: "/crm-next/deals",
        id: "timeline-opportunity-proposal",
        label: "Opportunity moved to proposal",
        occurredAt: "Today · 8:10 PM",
        source: "Opportunity"
      }
    ];
    const model = {
      timeline,
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const markup = renderToStaticMarkup(<CrmNextWorkCustomerView item={item} model={model} />);

    expect(markup).toContain("No recorded activity yet");
    expect(markup).toContain("There are no verified notes, calls, appointments, tasks, or updates recorded for Wil Johns yet.");
    expect(markup).not.toContain("Wil Johns has an active vehicle upgrade opportunity.");
    expect(markup).not.toContain("Michael Johnson has an active vehicle upgrade opportunity.");
  });

  it("shows verified customer timeline records while blocking unsourced seeded activity", () => {
    const item: CrmNextAttentionItem = {
      area: "Sales",
      customerHref: "/crm-next/customers/wil-johns",
      customerId: "wil-johns",
      customerName: "Wil Johns",
      id: "attn-wil-johns",
      level: "Medium",
      nextAction: "Review next customer action",
      owner: "Eli Manager",
      reason: "Customer record needs review",
      workHref: "/crm-next/work/attn-wil-johns"
    };
    const timeline: CrmNextTimelineEvent[] = [
      {
        detail: "Real note from CRM source · Source: Customer interactions",
        href: "/customers",
        id: "interaction:note-1",
        label: "Internal Note Internal",
        occurredAt: "2026-09-11T19:54:05.739Z",
        source: "Communication",
        sourceRecordId: "note-1"
      },
      {
        detail: "Seeded placeholder should not render.",
        href: "/crm-next/deals",
        id: "timeline-placeholder",
        label: "Opportunity moved to proposal",
        occurredAt: "Today",
        source: "Opportunity"
      }
    ];
    const model = {
      timeline,
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const workMarkup = renderToStaticMarkup(<CrmNextWorkCustomerView item={item} model={model} />);
    const timelineMarkup = renderToStaticMarkup(<CrmNextTimelineView model={model} />);

    expect(workMarkup).toContain("Internal Note Internal");
    expect(timelineMarkup).toContain("Internal Note Internal");
    expect(workMarkup).not.toContain("Seeded placeholder should not render.");
    expect(timelineMarkup).not.toContain("Seeded placeholder should not render.");
  });

  it("keeps the due task signal collapsed until staff asks for details", () => {
    const item: CrmNextAttentionItem = {
      area: "Sales",
      customerHref: "/crm-next/customers/naomi-nyambura-githongo",
      customerId: "naomi-nyambura-githongo",
      customerName: "Naomi Nyambura Githongo",
      id: "attn-naomi-follow-up",
      level: "Low",
      nextAction: "Work retail deal for selected vehicle",
      owner: "Sales Team",
      reason: "Customer is working a vehicle deal",
      workHref: "/crm-next/work/attn-naomi-follow-up"
    };
    const bridgePreview: CrmNextActionBridgePreview = {
      contractVersion: "crm-next-action-bridge/v1",
      liveTaskCreated: false,
      reason: "Task preview is available for this customer.",
      state: "DOGFOOD_READY",
      dispatchPreview: {
        assignedTo: "Sales Team",
        customer360Update: "Customer 360 will show the completed follow-up after the task is finished.",
        due: "Today 3:00 PM",
        source: "Customer Console · Naomi Nyambura Githongo · Delivery appointment needs completion",
        title: "Confirm delivery appointment follow-through"
      }
    };
    const model = {
      timeline: [],
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const markup = renderToStaticMarkup(<CrmNextWorkCustomerView bridgePreview={bridgePreview} item={item} model={model} />);

    expect(markup).toContain('aria-controls="workbench-due-task"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Task");
    expect(markup).toContain("1 due");
    expect(markup).toContain("View details");
    expect(markup).not.toContain("Due task");
    expect(markup).not.toContain("Today 3:00 PM");
    expect(markup).not.toContain("Work task on this page");
  });

  it("treats a linked vehicle as deal progress on the customer workbench", () => {
    const item: CrmNextAttentionItem = {
      area: "Sales",
      customerHref: "/crm-next/customers/naomi-nyambura-githongo",
      customerId: "naomi-nyambura-githongo",
      customerName: "Naomi Nyambura Githongo",
      id: "attn-naomi-follow-up",
      level: "Low",
      nextAction: "Work retail deal for selected vehicle",
      owner: "Sales Team",
      reason: "Customer is working a vehicle deal",
      workHref: "/crm-next/work/attn-naomi-follow-up"
    };
    const model = {
      customers: [
        {
          address: "Address available in Customers",
          communications: [],
          customerSince: "Sep 18, 2026",
          email: "Not recorded",
          glance: [],
          id: "naomi-nyambura-githongo",
          lifetimeValue: "Open customer record",
          name: "Naomi Nyambura Githongo",
          nextAction: "Work retail deal for selected vehicle",
          openCases: 0,
          openDeals: 0,
          phone: "Not recorded",
          riskLevel: "Low",
          status: "Active",
          vehicles: [{ id: "vehicle-jeep-cherokee", label: "2019 Jeep Cherokee Maroon", status: "Interested vehicle", vin: "Manual link" }],
          vehiclesOwned: 1
        }
      ],
      sales: { appointments: [], deals: [], leads: [], opportunities: [], testDrives: [] },
      timeline: [],
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const markup = renderToStaticMarkup(<CrmNextWorkCustomerView item={item} model={model} />);

    expect(markup).toContain("Vehicle selected");
    expect(markup).toContain("2019 Jeep Cherokee Maroon");
    expect(markup).toContain("Continue the deal");
    expect(markup).toContain("Schedule appointment");
    expect(markup).not.toContain("No deal is recorded on this workbench yet");
  });

  it("uses delivery close-out language for transport work instead of sales sold/lost", () => {
    const item: CrmNextAttentionItem = {
      area: "Sales",
      customerHref: "/crm-next/customers/max-auto-transport",
      customerId: "max-auto-transport",
      customerName: "Max Auto Transport",
      id: "attn-max-auto-transport",
      level: "Low",
      nextAction: "Confirm transporter delivered the vehicle",
      owner: "Eli Manager",
      reason: "Transporter delivered vehicle",
      workHref: "/crm-next/work/attn-max-auto-transport"
    };
    const model = {
      customers: [],
      sales: { appointments: [], deals: [], leads: [], opportunities: [], testDrives: [] },
      timeline: [],
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const markup = renderToStaticMarkup(<CrmNextWorkCustomerView item={item} model={model} />);

    expect(markup).toContain("Delivery / Transport");
    expect(markup).toContain("Delivered");
    expect(markup).toContain("Resolved");
    expect(markup).toContain("Closed");
    expect(markup).toContain("No Action Needed");
    expect(markup).toContain("Delivery / Transport is not a sales funnel");
    expect(markup).not.toContain(">Sold<");
    expect(markup).not.toContain(">Lost<");
  });

  it("hardens the customer list with source health, duplicate, owner, and closed outcome checks", () => {
    installLocalStorageWindow();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("crm-next:workbench:max auto transport:progress", JSON.stringify({
        notice: "Delivered saved on this workbench.",
        stage: "Delivered"
      }));
    }
    const customers: CrmNextCustomer360[] = [
      {
        address: "Address available in Customers",
        communications: [],
        customerSince: "Sep 18, 2026",
        email: "Not recorded",
        glance: [],
        id: "max auto transport",
        lifetimeValue: "Open customer record",
        name: "Max Auto Transport",
        nextAction: "Confirm transporter delivered the vehicle",
        openCases: 0,
        openDeals: 0,
        phone: "555-5898",
        riskLevel: "Low",
        status: "Active",
        vehicles: [],
        vehiclesOwned: 0
      },
      {
        address: "Address available in Customers",
        communications: [],
        customerSince: "Sep 18, 2026",
        email: "Not recorded",
        glance: [],
        id: "max-auto-transport-copy",
        lifetimeValue: "Open customer record",
        name: "Max Auto Transport",
        nextAction: "Review overdue customer follow-up",
        openCases: 0,
        openDeals: 0,
        phone: "555-5898",
        riskLevel: "High",
        status: "Active",
        vehicles: [],
        vehiclesOwned: 0
      }
    ];
    const model = {
      attention: [{
        area: "Support",
        customerHref: "/crm-next/customers/max%20auto%20transport",
        customerId: "max auto transport",
        customerName: "Max Auto Transport",
        id: "attn-max-auto-transport",
        level: "Low",
        nextAction: "Close delivery",
        owner: "Eli Manager",
        reason: "Transporter delivered vehicle",
        workHref: "/crm-next/work/attn-max-auto-transport"
      }],
      customers,
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const markup = renderToStaticMarkup(<CrmNextCustomersListView model={model} />);

    expect(markup).toContain("Visible records");
    expect(markup).toContain("Need owner");
    expect(markup).toContain("Possible duplicates");
    expect(markup).toContain("Closed locally");
    expect(markup).toContain('href="/crm-next/customers/max%20auto%20transport"');
    expect(markup).toContain("Delivered");
    expect(markup).toContain("Vendor");
    expect(markup).not.toContain("Vendor / Partner");
    expect(markup).toContain("Possible duplicate");
    expect(markup).toContain("Needs owner");
  });

  it("removes locally closed workbench outcomes from attention queues", () => {
    installLocalStorageWindow();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("crm-next:workbench:max-auto-transport:progress", JSON.stringify({
        notice: "Delivered saved on this workbench.",
        stage: "Delivered"
      }));
    }
    const model = {
      attention: [
        {
          area: "Sales",
          customerHref: "/crm-next/customers/max-auto-transport",
          customerId: "max-auto-transport",
          customerName: "Max Auto Transport",
          id: "customer-read-max-auto-transport",
          level: "High",
          nextAction: "Review overdue customer follow-up",
          owner: "Eli Manager",
          reason: "Overdue customer follow-up",
          workHref: "/crm-next/work/customer-read-max-auto-transport"
        },
        {
          area: "Sales",
          customerHref: "/crm-next/customers/ardo-abdi",
          customerId: "ardo-abdi",
          customerName: "Ardo Abdi",
          id: "customer-read-ardo-abdi",
          level: "High",
          nextAction: "Review overdue customer follow-up",
          owner: "Eli Manager",
          reason: "Overdue customer follow-up",
          workHref: "/crm-next/work/customer-read-ardo-abdi"
        }
      ],
      customers: [],
      summary: [],
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const commandMarkup = renderToStaticMarkup(<CrmNextCommandCenterView model={model} />);
    const queueMarkup = renderToStaticMarkup(<CrmNextNeedsAttentionView model={model} />);

    expect(commandMarkup).toContain("Ardo Abdi");
    expect(commandMarkup).not.toContain("Max Auto Transport");
    expect(queueMarkup).toContain("Ardo Abdi");
    expect(queueMarkup).not.toContain("Max Auto Transport");
  });

  it("uses the sales work area as the customer list category when the next action is generic", () => {
    const customer: CrmNextCustomer360 = {
      address: "Address available in Customers",
      communications: [],
      customerSince: "Sep 18, 2026",
      email: "wil@example.test",
      glance: [],
      id: "wil-johns",
      lifetimeValue: "Open customer record",
      name: "Wil Johns",
      nextAction: "Review customer record",
      openCases: 0,
      openDeals: 0,
      phone: "555-3671",
      riskLevel: "High",
      status: "Active",
      vehicles: [],
      vehiclesOwned: 0
    };
    const model = {
      attention: [{
        area: "Sales",
        customerHref: "/crm-next/customers/wil-johns",
        customerId: "wil-johns",
        customerName: "Wil Johns",
        id: "attn-wil-johns",
        level: "High",
        nextAction: "Review overdue customer follow-up",
        owner: "Eli Manager",
        reason: "Overdue customer follow-up",
        workHref: "/crm-next/work/attn-wil-johns"
      }],
      customers: [customer],
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const markup = renderToStaticMarkup(<CrmNextCustomersListView model={model} />);

    expect(markup).toContain("<dd>Sales</dd>");
    expect(markup).not.toContain("<dd>General</dd>");
  });

  it("keeps CRM Next consoles open when live source envelopes are partial", () => {
    const partialModel = {
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const commandMarkup = renderToStaticMarkup(<CrmNextCommandCenterView model={partialModel} />);
    const customerListMarkup = renderToStaticMarkup(<CrmNextCustomersListView model={partialModel} />);
    const searchMarkup = renderToStaticMarkup(<CrmNextSearchView model={partialModel} />);
    const timelineMarkup = renderToStaticMarkup(<CrmNextTimelineView model={partialModel} />);

    expect(commandMarkup).toContain("Who needs attention?");
    expect(commandMarkup).toContain("No source data available");
    expect(commandMarkup).toContain("Report readiness is unavailable while enterprise signals refresh.");
    expect(customerListMarkup).toContain("0 visible");
    expect(searchMarkup).toContain("Search customers, vehicles, deals, communications, or work.");
    expect(timelineMarkup).toContain("No recorded activity yet");
  });

  it("shows matching customer records on CRM Next search", () => {
    const model = {
      customers: [{
        address: "Address available in Customers",
        communications: [],
        customerSince: "CUS-ASMAA",
        email: "a•••@e•••.com",
        glance: [],
        id: "customer-asmaa",
        lifetimeValue: "Open customer record",
        name: "Asmaa Mohamed Salah",
        nextAction: "Review customer record",
        openCases: 0,
        openDeals: 0,
        phone: "••••3073",
        riskLevel: "Low",
        status: "Active",
        vehicles: [],
        vehiclesOwned: 0
      }],
      search: {
        activeQuery: "asmaa",
        groups: [{ count: 1, description: "Asmaa Mohamed Salah", href: "/crm-next/customers/customer-asmaa", id: "live-customer", label: "Customers", safety: "Live read-only result." }],
        queryPlaceholder: "Search customers, vehicles, deals, communications, or work."
      },
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const markup = renderToStaticMarkup(<CrmNextSearchView model={model} />);

    expect(markup).toContain("Asmaa Mohamed Salah");
    expect(markup).toContain('href="/crm-next/customers/customer-asmaa"');
    expect(markup).toContain("Review customer record");
  });

  it("reflects a saved terminal workbench outcome on Customer 360", () => {
    installLocalStorageWindow();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("crm-next:workbench:max-auto-transport:progress", JSON.stringify({
        notice: "Delivered saved on this workbench.",
        stage: "Delivered"
      }));
    }
    const customer: CrmNextCustomer360 = {
      address: "Address available in Customers",
      communications: [],
      customerSince: "Sep 18, 2026",
      email: "Not recorded",
      glance: [],
      id: "max-auto-transport",
      lifetimeValue: "Open customer record",
      name: "Max Auto Transport",
      nextAction: "Confirm transporter delivered the vehicle",
      openCases: 0,
      openDeals: 0,
      phone: "555-5898",
      riskLevel: "Low",
      status: "Active",
      vehicles: [],
      vehiclesOwned: 0
    };
    const model = {
      attention: [],
      customers: [customer],
      enterpriseLayer: {
        adminGuardrails: [],
        automationRecommendations: [],
        reportingBrief: {} as CrmNextCommandCenter["enterpriseLayer"]["reportingBrief"],
        supportingParties: []
      },
      operationalRead: {
        state: "LIVE_READ",
        sources: [{
          detail: "Customer 360 detail is available.",
          href: "/crm-next/customers/max-auto-transport",
          id: "customer-360",
          label: "Customer 360 detail",
          observedAt: "Now",
          sourceOfTruth: "Customers",
          state: "LIVE_READ"
        }]
      },
      timeline: [],
      userName: "Customer Console Page User"
    } as CrmNextCommandCenter;

    const markup = renderToStaticMarkup(<CrmNextCustomer360View customer={customer} model={model} />);

    expect(markup).toContain("<dd>Delivered</dd>");
    expect(markup).toContain("Workbench outcome reflected");
    expect(markup).toContain("Delivered recorded. Confirm note, owner, and any follow-up before archiving.");
  });
});
