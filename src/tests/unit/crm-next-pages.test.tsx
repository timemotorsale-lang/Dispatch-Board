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
import { CrmNextActionReadinessView, CrmNextTimelineView, CrmNextWorkCustomerView } from "@/features/crm-next/crm-next-shell";
import { CRM_STAFF_FACING_BANNED_TERMS } from "@/lib/crm-staff-language";
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

describe("CRM Next pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
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
    const ownershipSupport = renderToStaticMarkup(await CrmNextOwnershipSupportPage());
    const sharedExecution = renderToStaticMarkup(await CrmNextSharedExecutionPage());
    const intelligence = renderToStaticMarkup(await CrmNextIntelligenceFoundationPage());
    const leadSourceReport = renderToStaticMarkup(await CrmNextLeadSourceReportPage());
    const pilot = renderToStaticMarkup(await CrmNextPilotReadinessPage());
    const hardening = renderToStaticMarkup(await CrmNextHardeningPage());
    const coexistence = renderToStaticMarkup(await CrmNextCoexistencePage());
    const pilotRelease = renderToStaticMarkup(await CrmNextPilotReleasePage());
    const search = renderToStaticMarkup(await CrmNextSearchPage({ searchParams: Promise.resolve({}) }));
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
    expect(command).toContain('href="/crm-next/deals"');
    expect(command).toContain("Customer next actions");
    expect(command).toContain("Appointment board");
    expect(command).toContain("Recommended by system");
    expect(command).toContain("Report readiness");
    expect(command).toContain("Supporting Parties");
    expect(command).toContain("Admin guardrails");
    expect(command).toContain("Minnesota DMV");
    expect(command).toContain("Northside Towing");
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
    expect(customer).toContain("Supporting Parties");
    expect(customer).toContain("Warranty company");
    expect(work).toContain("Customer record unavailable");
    expect(work).toContain("Customer file");
    expect(work).toContain("Check - In");
    expect(work).toContain("Start Deal");
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
    expect(work).toContain("Missed Appt.");
    expect(work).toContain("Visit Follow-up");
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
    expect(work).toContain("Disposition");
    expect(work).toContain('aria-pressed="true"');
    expect(work).toContain("<button");
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
    expect(search).toContain("Add Customer / Prospect");
    expect(newCustomer).toContain("Add a customer or prospect");
    expect(newCustomer).toContain("Customer details");
    expect(newCustomer).toContain("Detailed customer intake");
    expect(newCustomer).toContain("Buyer Info");
    expect(newCustomer).toContain("Customer type");
    expect(newCustomer).toContain("Lead and assignment");
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
    for (const staffMarkup of [command, attention, customer, search, timeline, pipeline, appointments, testDrives, deals, ownershipSupport, sharedExecution, intelligence, leadSourceReport, work, logCallAction, newTaskAction, emailAction, newCustomer]) {
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
    expect(timeline).toContain("Customer activity timeline");
    expect(timeline).toContain("No recorded activity yet");
    expect(timeline).not.toContain("Opportunity moved to proposal");
    expect(pipeline).toContain("Pipeline board");
    expect(appointments).toContain("Appointments");
    expect(testDrives).toContain("Test drives");
    expect(deals).toContain("Deals in progress");
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
    expect(markup).toContain("Repairs");
    expect(markup).toContain("Test Drive");
    expect(markup).toContain("Daily Rental");
    expect(markup).toContain("Vehicle Loaner");
    expect(markup).toContain("Warranty Products");
    expect(markup).toContain("Financing Products");
    expect(markup).toContain("Outside Finance / One Pay");
    expect(markup).toContain("Applicant info");
    expect(markup).toContain("Add co-buyer");
    expect(markup).toContain("Print credit application");
    expect(markup).toContain("Text credit application");
    expect(markup).toContain("Email credit application");
    expect(markup).toContain("approved CRM communications provider");
    expect(markup).toContain("Vehicle info");
    expect(markup).toContain("KBB retail");
    expect(markup).toContain("17-character VIN");
    expect(markup).toContain("Last 6 of VIN");
    expect(markup).toContain("Decode VIN");
    expect(markup).toContain("Color");
    expect(markup).toContain("Exterior color");
    expect(markup).toContain("Enter a 17-character VIN to decode vehicle facts.");
    expect(markup).toContain("Trade-in info");
    expect(markup).toContain("Trade payoff");
    expect(markup).toContain("Deal info");
    expect(markup).toContain("Amount financed");
    expect(markup).toContain("Down payment");
    expect(markup).toContain("Price + fees + tax - down payment");
    expect(markup).toContain("MN sales tax: 6.85% of selling price");
    expect(markup).toContain("Manual tax override");
    expect(markup).toContain("Monthly payment");
    expect(markup).toContain("36 months");
    expect(markup).toContain("Calculated from amount financed, term, and APR");
    expect(markup).toContain("Manual payment override");
    expect(markup).toContain("MN DMV fees");
    expect(markup).toContain("Fee worksheet");
    expect(markup).toContain("Title transfer");
    expect(markup).toContain("Filing fee");
    expect(markup).toContain("Total fees");
    expect(markup).toContain("Formula: Total fees = sum of selected MN DMV fee items");
    expect(markup).toContain("Contracted forms");
    expect(markup).toContain("Minnesota sale packet");
    expect(markup).toContain("Packet readiness");
    expect(markup).toContain("Open MN sale packet");
    expect(markup).toContain("Save draft");
    expect(markup).toContain("Complete intake");
    expect(markup).toContain("Execution Summary");
    expect(markup).toContain("Identity");
    expect(markup).toContain("Delivery");
    expect(markup).toContain("Payment / funding");
    expect(markup).toContain("Open execution path");
    expect(markup).not.toContain("Review shell");
    expect(markup).not.toContain("review mode");
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
});
