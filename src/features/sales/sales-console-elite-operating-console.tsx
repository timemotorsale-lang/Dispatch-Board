"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { salesConsoleMvpAcceptanceChecklist, salesConsoleSourceHealthSummary } from "./sales-console-mvp-release-hardening";
import { salesConsoleM64ConnectedMvpGate, salesConsoleM64ReadyCount } from "./sales-console-m64-connected-mvp-deployment-gate";
import {
  getSalesConsoleAppointmentHref,
  getSalesConsoleCrossConsoleLinksForLane,
  getSalesConsoleCustomer360Href,
  getSalesConsoleTaskHref,
  getSalesConsoleVehicle360Href,
  salesConsoleCrossConsoleNavigationTargets,
  withSalesConsoleReturnTo
} from "./sales-console-cross-console-integration";
import { buildSalesConsoleSourceBackedTabStates } from "./sales-console-source-backed-ui";
import { getRevenueLaneContract } from "./sales-console-operational-domain";
import { salesConsoleMvpRolloutGateItems, salesConsoleMvpRolloutGatePassCount } from "./sales-console-mvp-rollout-gate";
import { salesConsoleRolloutHardeningChecks, salesConsoleRolloutHardeningPassCount } from "./sales-console-rollout-hardening";
import {
  salesConsoleDeliveryReadiness,
  salesConsoleInventoryAlternatives,
  salesConsoleLiveActivityDecision,
  salesConsoleLiveAppointments,
  salesConsoleLiveCustomer360,
  salesConsoleLiveEvidenceRecord,
  salesConsoleLiveEvidenceValidation,
  salesConsoleLiveInventoryMatches,
  salesConsoleLiveLeadRecords,
  salesConsoleLiveManagerQueues,
  salesConsoleLiveOutcomeDecision,
  salesConsoleLiveRevenueLanes,
  salesConsoleLiveTasksAndPromises,
  salesConsoleLiveWorkItems,
  buildSalesConsoleGuidedPath,
  searchSalesConsoleLiveExperience,
  type SalesConsoleLiveActionState,
  type SalesConsoleLiveWorkItem
} from "./sales-console-live-workflow-engine";
import { salesConsolePipelineRecords } from "./sales-console-pipeline-customer360";
import {
  buildSalesRecordWorkflowState,
  salesConsoleSampleRecordSaleDraft
} from "./sales-console-m68-record-sale-ui-workflow";
import {
  buildPostSaleExecutionWorkflow,
  salesConsoleSampleCompletedSaleRecord
} from "./sales-console-m69-post-sale-execution-workflow";
import {
  buildSalesBookLedger,
  salesConsoleSampleSalesBookRecords
} from "./sales-console-m70-sales-book-ledger-view";
import { salesConsoleSampleReconciliationQueue } from "./sales-console-m71-source-reconciliation-foundation";
import type { SalesFederatedSearchResult } from "./sales-console-m57-federated-search";
import styles from "./sales-console-elite-operating-console.module.css";

type ActionState = SalesConsoleLiveActionState;
type WorkItem = SalesConsoleLiveWorkItem;

type StaffRole = "Salesperson" | "BDC / Lead Coordinator" | "Sales Manager" | "Admin / Owner";
type SalesIntentId =
  | "sell-new-customer"
  | "work-todays-leads"
  | "continue-active-deal"
  | "recover-stalled-opportunity"
  | "prepare-appointment"
  | "close-ready-opportunity"
  | "review-manager-priorities";

type WorkspaceSummary = {
  title: string;
  description: string;
  primaryMetric: string;
  allowed: string;
  governed: string;
};

type SalesIntent = {
  id: SalesIntentId;
  title: string;
  purpose: string;
  startsWith: string;
  workspace: string;
  nextAction: string;
  sourceTruth: string;
  requiredFacts: string[];
  workflow: string[];
};

const salesIntentHomeNav = "Sales Intent Home";
const revenueWorkQueueNav = "Revenue Work Queue";
const guidedWorkspaceNav = "Guided Workspace";
const enterpriseDashboardNav = "Enterprise Dashboard";
const sourceHealthNav = "Source Health";

const navigation = [
  salesIntentHomeNav,
  revenueWorkQueueNav,
  guidedWorkspaceNav,
  enterpriseDashboardNav,
  sourceHealthNav
];

const roleLanding: Record<StaffRole, string> = {
  "Salesperson": salesIntentHomeNav,
  "BDC / Lead Coordinator": salesIntentHomeNav,
  "Sales Manager": salesIntentHomeNav,
  "Admin / Owner": salesIntentHomeNav
};

const workspaceSummaries: Record<string, WorkspaceSummary> = {
  [salesIntentHomeNav]: {
    title: "Sales Intent Home",
    description: "Start with what staff is trying to accomplish, then unfold the exact guided workflow.",
    primaryMetric: "7 guided sales intents",
    allowed: "Choose intent, see required facts, open the correct Sales workspace.",
    governed: "No fabricated recommendations; every action must be tied to source-backed customer, lead, deal, or appointment context."
  },
  [revenueWorkQueueNav]: {
    title: "Revenue Work Queue",
    description: "Ranked by urgency, value, readiness, blockers, source truth, and next action.",
    primaryMetric: "Source-backed ranked work",
    allowed: "Filter work, open source context, and start the selected customer or lane workspace.",
    governed: "Queue items must come from source-shaped work records; no sample work is allowed."
  },
  [guidedWorkspaceNav]: {
    title: "Guided Workspace",
    description: "One selected customer, deal, or revenue lane at a time.",
    primaryMetric: "1 active context",
    allowed: "Review selected customer context, source links, blockers, and governed next steps.",
    governed: "Outcome writes and source-system actions stay controlled until approved workflow exists."
  },
  [enterpriseDashboardNav]: {
    title: "Enterprise Dashboard",
    description: "Optional manager and owner visibility across revenue lanes, source health, risk, and performance.",
    primaryMetric: "Optional leadership view",
    allowed: "Inspect cross-lane signals, source-backed queues, and leadership action areas.",
    governed: "Dashboard metrics must drill into source-backed details or show an unavailable state."
  },
  [sourceHealthNav]: {
    title: "Source Health",
    description: "Implementation readiness, source wiring, rollout evidence, and audit guardrails.",
    primaryMetric: "Source health",
    allowed: "Review source readiness and release evidence.",
    governed: "Admin policy changes require explicit future workflow."
  },
  "Today": {
    title: "My Team's Work Queue",
    description: "Ranked by next best action, freshness, source, blockers, and revenue lane.",
    primaryMetric: "36 active work items",
    allowed: "Open records, filter work, open Revenue Desk, request manager review.",
    governed: "Customer messages and quote submission stay controlled."
  },
  "Leads": {
    title: "Lead Operations",
    description: "Lead intake, SLA risk, dedupe review, assignment visibility, and appointment conversion.",
    primaryMetric: "12 leads at SLA risk",
    allowed: "Open lead, review duplicate risk, filter by source, inspect owner and next action.",
    governed: "Lead reassignment writes wait for approved backend workflow."
  },
  "Pipeline": {
    title: "Pipeline",
    description: "Opportunity stage movement, aging, closeability, lane mix, and freshness health.",
    primaryMetric: "$436K commit pipeline",
    allowed: "Open opportunity, filter by stage, inspect blockers, update visible context.",
    governed: "Stage transitions require future command workflow."
  },
  "Customers": {
    title: "Customer 360",
    description: "Relationship context, consent, active opportunities, documents, promises, and timeline.",
    primaryMetric: "1 selected customer",
    allowed: "Open selected customer context and source-labeled sales history.",
    governed: "CRM remains the customer system of record."
  },
  "Revenue Desk": {
    title: "Revenue Desk",
    description: "Lane-aware commercial workspace across cash, BHPH, lease-to-own, repair, rental, warranty, and finance products.",
    primaryMetric: "7 revenue lanes",
    allowed: "Switch lanes, inspect required fields, open manager review.",
    governed: "Quotes, discounts, finance decisions, and holds remain governed."
  },
  "Inventory Intelligence": {
    title: "Inventory Intelligence",
    description: "Vehicle match, readiness, market pressure, aging, availability, and alternatives.",
    primaryMetric: "3 top matches",
    allowed: "Inspect vehicle fit and readiness blockers.",
    governed: "Vehicle holds and reservations stay unavailable."
  },
  "Appointments": {
    title: "Appointments",
    description: "Confirmation, arrival, no-show, and showroom sales lens.",
    primaryMetric: "8 appointments today",
    allowed: "Inspect appointment risk and related opportunity context.",
    governed: "Scheduling writes remain source-system controlled."
  },
  "Tasks & Promises": {
    title: "Tasks & Promises",
    description: "Owned commitments, due dates, blockers, evidence status, and follow-through.",
    primaryMetric: "9 promises open",
    allowed: "Inspect promise owners, due state, and evidence.",
    governed: "Promise completion writes require future command workflow."
  },
  "Finance Handoff": {
    title: "Finance Handoff",
    description: "Readiness, missing fields, documentation blockers, and return reasons.",
    primaryMetric: "5 handoffs need review",
    allowed: "Inspect finance readiness and blockers.",
    governed: "Finance decisions remain outside Sales Console authority."
  },
  "Delivery Readiness": {
    title: "Delivery Readiness",
    description: "Finance cleared, documents ready, vehicle ready, customer confirmed, delivery scheduled.",
    primaryMetric: "4 deliveries at risk",
    allowed: "Inspect checklist and blocker owner.",
    governed: "Delivery completion writes require source workflow."
  },
  "Manager Command": {
    title: "Manager Command Center",
    description: "Review queue, stalled revenue, SLA risk, approval backlog, coaching, and forecast confidence.",
    primaryMetric: "17 reviews queued",
    allowed: "Open manager risk cards and drill into related records.",
    governed: "Approvals, discounts, and finance decisions remain governed."
  },
  "Reports & Forecast": {
    title: "Reports & Forecast",
    description: "Forecast confidence, revenue mix, close risk, gross trend, and leaderboard health.",
    primaryMetric: "72% forecast confidence",
    allowed: "Inspect forecast bands and source-labeled metrics.",
    governed: "Manager forecast overrides require future audit workflow."
  },
  "Admin / Source Health": {
    title: "Admin / Source Health",
    description: "Source health, readiness gates, policy review, and implementation evidence for authorized users.",
    primaryMetric: "98% source health",
    allowed: "Review source health and rollout gates.",
    governed: "Admin policy changes require explicit future workflow."
  }
};

const salesIntents: SalesIntent[] = [
  {
    id: "sell-new-customer",
    title: "Sell to a new customer",
    purpose: "Create the selling path only after the person and intent are captured.",
    startsWith: "Customer or prospect intake",
    workspace: "Leads",
    nextAction: "Capture person, source, contact consent, vehicle interest, and urgency.",
    sourceTruth: "Customer and lead records",
    requiredFacts: ["Customer identity", "Contact method", "Buying intent", "Vehicle interest"],
    workflow: ["Confirm customer record", "Check duplicate risk", "Create lead", "Recommend first contact"]
  },
  {
    id: "work-todays-leads",
    title: "Work today's leads",
    purpose: "Rank live leads by urgency, SLA risk, and revenue opportunity.",
    startsWith: "Lead Operations",
    workspace: "Leads",
    nextAction: "Open the highest-priority lead and complete the recommended contact step.",
    sourceTruth: "Durable lead and customer records",
    requiredFacts: ["Lead source", "SLA age", "Owner", "Next action"],
    workflow: ["Review ranked lead", "Open Customer 360", "Contact or schedule", "Record outcome"]
  },
  {
    id: "continue-active-deal",
    title: "Continue an active deal",
    purpose: "Move a real opportunity forward without losing the customer context.",
    startsWith: "Pipeline",
    workspace: "Pipeline",
    nextAction: "Open the active opportunity and remove the next blocker.",
    sourceTruth: "Opportunity, vehicle, and customer records",
    requiredFacts: ["Stage", "Vehicle", "Blocker", "Owner"],
    workflow: ["Open opportunity", "Check blocker", "Pick next best action", "Capture decision"]
  },
  {
    id: "recover-stalled-opportunity",
    title: "Recover a stalled opportunity",
    purpose: "Bring back deals that have gone quiet before they become lost.",
    startsWith: "Manager Command",
    workspace: "Manager Command",
    nextAction: "Review stale work, last touch, and manager intervention options.",
    sourceTruth: "Activity, task, appointment, and opportunity history",
    requiredFacts: ["Days since activity", "Last promise", "Blocker", "Manager review need"],
    workflow: ["Identify stall reason", "Choose recovery play", "Assign follow-up", "Track response"]
  },
  {
    id: "prepare-appointment",
    title: "Prepare for an appointment or visit",
    purpose: "Make staff ready before the customer arrives or receives a follow-up.",
    startsWith: "Appointments",
    workspace: "Appointments",
    nextAction: "Open appointment context and confirm readiness, reminders, and vehicle prep.",
    sourceTruth: "Appointment console and Customer 360",
    requiredFacts: ["Appointment time", "Purpose", "Customer", "Owner"],
    workflow: ["Confirm appointment", "Review Customer 360", "Check readiness", "Set reminder"]
  },
  {
    id: "close-ready-opportunity",
    title: "Close a ready opportunity",
    purpose: "Guide the final steps only when the deal has the required proof and approvals.",
    startsWith: "Revenue Desk",
    workspace: "Revenue Desk",
    nextAction: "Verify lane requirements, manager approvals, and source-owned write steps.",
    sourceTruth: "Revenue lane, deal, finance, and document records",
    requiredFacts: ["Revenue lane", "Approval status", "Missing documents", "Delivery readiness"],
    workflow: ["Validate requirements", "Request approval if needed", "Record sale packet", "Plan delivery"]
  },
  {
    id: "review-manager-priorities",
    title: "Review manager priorities",
    purpose: "Give leaders one place to choose the next revenue-impacting action.",
    startsWith: "Manager Command",
    workspace: "Manager Command",
    nextAction: "Open risk queues for stalled revenue, SLA exposure, approvals, and coaching.",
    sourceTruth: "Manager queues and source health",
    requiredFacts: ["Queue count", "Risk reason", "Owner", "Recommended action"],
    workflow: ["Open risk queue", "Review source evidence", "Assign action", "Monitor outcome"]
  }
];

const actionTone: Record<ActionState, string> = {
  "Live Action": styles.live,
  "Controlled Action": styles.controlled,
  "Source-System Action": styles.source,
  "Future / Governed": styles.future
};

export function SalesConsoleEliteOperatingConsole() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams?.get("customerId") ?? null;
  const initialWorkspace = searchParams?.get("workspace") ?? null;
  const initialSelectedCustomer = salesConsoleLiveWorkItems.find((item) => item.customerId === initialCustomerId) ?? salesConsoleLiveWorkItems[0];
  const initialSelectedLane =
    salesConsoleLiveRevenueLanes.find((lane) => lane.contractLane === initialSelectedCustomer.contractLane) ??
    salesConsoleLiveRevenueLanes[0];
  const [activeNav, setActiveNav] = useState(initialWorkspace === "guided" ? guidedWorkspaceNav : salesIntentHomeNav);
  const [activeRole, setActiveRole] = useState<StaffRole>("Sales Manager");
  const [activeIntentId, setActiveIntentId] = useState<SalesIntentId>("work-todays-leads");
  const [query, setQuery] = useState("");
  const [laneFilter, setLaneFilter] = useState("All Lanes");
  const [queueGroupFilter, setQueueGroupFilter] = useState("All Priorities");
  const [queueSourceFilter, setQueueSourceFilter] = useState("All Sources");
  const [selectedCustomer, setSelectedCustomer] = useState(initialSelectedCustomer);
  const [selectedLane, setSelectedLane] = useState(initialSelectedLane);
  const [selectedLead, setSelectedLead] = useState(salesConsoleLiveLeadRecords[0]);
  const [selectedInventory, setSelectedInventory] = useState(salesConsoleLiveInventoryMatches[0]);
  const [selectedManagerQueue, setSelectedManagerQueue] = useState<(typeof salesConsoleLiveManagerQueues)[number]>(salesConsoleLiveManagerQueues[0]);
  const [recordSaleStatus, setRecordSaleStatus] = useState<string | null>(null);
  const [workbenchOutcomeStatus, setWorkbenchOutcomeStatus] = useState<string | null>(null);
  const [isRecordSalePending, startRecordSaleTransition] = useTransition();
  const [isWorkbenchOutcomePending, startWorkbenchOutcomeTransition] = useTransition();
  const activeWorkspace = workspaceSummaries[activeNav] ?? workspaceSummaries[revenueWorkQueueNav];
  const activeIntent = salesIntents.find((intent) => intent.id === activeIntentId) ?? salesIntents[0];
  const selectedLaneContract = getRevenueLaneContract(selectedLane.contractLane);
  const selectedLaneLinks = getSalesConsoleCrossConsoleLinksForLane(selectedLane.contractLane, activeRole);
  const selectedGuidedPath = useMemo(() => buildSalesConsoleGuidedPath(selectedCustomer), [selectedCustomer]);
  const sourceBackedTabStates = useMemo(() => buildSalesConsoleSourceBackedTabStates(), []);
  const activeSourceBackedState = sourceBackedTabStates.find((state) => state.tab === activeNav);
  const recordSaleWorkflowState = useMemo(
    () => buildSalesRecordWorkflowState({
      ...salesConsoleSampleRecordSaleDraft,
      customerName: selectedCustomer.customer,
      revenueLane: selectedLane.contractLane,
      productLabel: selectedCustomer.vehicle,
      vehicleStockNumber: selectedCustomer.stock,
      satisfied: [...salesConsoleSampleRecordSaleDraft.satisfied, "evidence-attached"],
      evidenceIds: salesConsoleLiveEvidenceRecord ? [salesConsoleLiveEvidenceRecord.id] : [],
      sourceRecordLinks: [getSalesConsoleCustomer360Href(selectedCustomer.customer), getSalesConsoleVehicle360Href(selectedCustomer.stock)]
    }, activeRole),
    [activeRole, selectedCustomer, selectedLane]
  );
  const postSaleExecutionWorkflow = useMemo(
    () => buildPostSaleExecutionWorkflow({
      ...salesConsoleSampleCompletedSaleRecord,
      customerName: selectedCustomer.customer,
      revenueLane: selectedLane.contractLane,
      productLabel: selectedCustomer.vehicle,
      vehicleStockNumber: selectedCustomer.stock,
      sourceRecordLinks: [getSalesConsoleCustomer360Href(selectedCustomer.customer), getSalesConsoleVehicle360Href(selectedCustomer.stock)]
    }),
    [selectedCustomer, selectedLane]
  );
  const salesBookLedger = useMemo(
    () => buildSalesBookLedger(salesConsoleSampleSalesBookRecords, activeRole, activeRole === "Salesperson" ? "USER-1" : "MGR-1"),
    [activeRole]
  );

  const filteredWork = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return salesConsoleLiveWorkItems.filter((item) => {
      const matchesLane = laneFilter === "All Lanes" || item.lane === laneFilter;
      const matchesGroup = queueGroupFilter === "All Priorities" || item.group === queueGroupFilter;
      const matchesSource = queueSourceFilter === "All Sources" || item.source === queueSourceFilter;
      const matchesSearch =
        !normalized ||
        [item.customer, item.contact, item.vehicle, item.stock, item.lane, item.stage, item.source, item.group]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesLane && matchesGroup && matchesSource && matchesSearch;
    });
  }, [laneFilter, query, queueGroupFilter, queueSourceFilter]);

  const searchExperience = useMemo(() => searchSalesConsoleLiveExperience(query, activeRole), [activeRole, query]);
  const searchResults = searchExperience.results;
  const queueGroups = useMemo(() => [...new Set(salesConsoleLiveWorkItems.map((item) => item.group))], []);
  const queueSources = useMemo(() => [...new Set(salesConsoleLiveWorkItems.map((item) => item.source))], []);
  const queueStats = useMemo(() => ([
    { label: "Ranked Work", value: salesConsoleLiveWorkItems.length.toString(), filter: "All Priorities", detail: "Source-backed work records" },
    { label: "Do Now", value: salesConsoleLiveWorkItems.filter((item) => item.group === "Must Do Now").length.toString(), filter: "Must Do Now", detail: "Urgency and value signals" },
    { label: "Manager Review", value: salesConsoleLiveWorkItems.filter((item) => item.group === "Manager Review").length.toString(), filter: "Manager Review", detail: "Rule-triggered review" },
    { label: "Blocked", value: salesConsoleLiveWorkItems.filter((item) => item.group === "Blocked").length.toString(), filter: "Blocked", detail: "Needs source or staff action" },
    { label: "Revenue Lanes", value: new Set(salesConsoleLiveWorkItems.map((item) => item.contractLane)).size.toString(), filter: "All Priorities", detail: "Cross-lane coverage" }
  ]), []);
  const groupedWork = useMemo(() => {
    const groups: WorkItem["group"][] = ["Must Do Now", "Today", "Waiting", "Manager Review", "Blocked", "Watch"];

    return groups.map((group) => ({
      group,
      items: filteredWork.filter((item) => item.group === group)
    }));
  }, [filteredWork]);

  function openSearchResult(result: SalesFederatedSearchResult) {
    if (result.category === "manager-review" || result.category === "evidence") setActiveNav(enterpriseDashboardNav);
    else if (result.category === "appointment" || result.category === "task-promise" || result.category === "stock-vin" || result.category === "customer" || result.category === "phone-email") setActiveNav(guidedWorkspaceNav);
    else setActiveNav(revenueWorkQueueNav);

    const matchedWork = salesConsoleLiveWorkItems.find((item) => result.tokens.some((token) => token.includes(item.customer) || token.includes(item.stock)));
    const matchedLane = salesConsoleLiveRevenueLanes.find((lane) => result.tokens.some((token) => token.includes(lane.name) || token.includes(lane.contractLane)));

    if (matchedWork) setSelectedCustomer(matchedWork);
    if (matchedLane) setSelectedLane(matchedLane);
  }

  function openSalesIntent(intent: SalesIntent) {
    setActiveIntentId(intent.id);
    setActiveNav(revenueWorkQueueNav);
    setQueueGroupFilter(intent.id === "recover-stalled-opportunity" || intent.id === "review-manager-priorities" ? "Manager Review" : "All Priorities");
  }

  function openQueueItem(item: WorkItem) {
    setSelectedCustomer(item);
    const matchedLane = salesConsoleLiveRevenueLanes.find((lane) => lane.contractLane === item.contractLane);
    if (matchedLane) setSelectedLane(matchedLane);
    setActiveNav(guidedWorkspaceNav);
    setWorkbenchOutcomeStatus(null);
  }

  function openWorkbenchHref(href: string) {
    if (href.startsWith("/sales?workspace=revenue-desk")) {
      const matchedLane = salesConsoleLiveRevenueLanes.find((lane) => lane.contractLane === selectedCustomer.contractLane);
      if (matchedLane) setSelectedLane(matchedLane);
      setActiveNav(enterpriseDashboardNav);
      setWorkbenchOutcomeStatus(`Revenue Desk opened for ${selectedCustomer.customer}.`);
      return;
    }

    globalThis.location.assign(href);
  }

  function saveWorkbenchOutcome(option: string) {
    setWorkbenchOutcomeStatus(null);
    startWorkbenchOutcomeTransition(async () => {
      const response = await fetch(selectedGuidedPath.outcomeWriteBackTarget, {
        body: JSON.stringify({
          body: [
            `Sales Workbench outcome: ${option}`,
            `Customer: ${selectedCustomer.customer}`,
            `Revenue lane: ${selectedGuidedPath.revenueLane}`,
            `Lifecycle stage: ${selectedGuidedPath.lifecycleStage}`,
            `Next step before outcome: ${selectedGuidedPath.nextStep}`,
            `Source: Sales Workbench`
          ].join("\n"),
          idempotencyKey: `sales-workbench-outcome-${selectedCustomer.customerId}-${selectedCustomer.stock}-${option.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          visibility: "INTERNAL"
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const result = await response.json().catch(() => null) as { error?: string; noteId?: string } | null;

      if (!response.ok || !result?.noteId) {
        setWorkbenchOutcomeStatus(result?.error ?? "Outcome could not be written to Customer 360 activity.");
        return;
      }

      setWorkbenchOutcomeStatus(`${option} saved to Customer 360 activity.`);
    });
  }

  function submitSelectedSaleRecord() {
    setRecordSaleStatus(null);
    startRecordSaleTransition(async () => {
      const response = await fetch("/api/sales/completed-sale-records", {
        body: JSON.stringify({
          ...salesConsoleSampleRecordSaleDraft,
          customerId: `CUSTOMER-${selectedCustomer.customer.replaceAll(" ", "-").toUpperCase()}`,
          customerName: selectedCustomer.customer,
          evidenceIds: salesConsoleLiveEvidenceRecord ? [salesConsoleLiveEvidenceRecord.id] : [],
          grossEstimateCents: 285000,
          idempotencyKey: `sales-record-${selectedCustomer.stock}-${selectedLane.contractLane}`,
          managerId: "MGR-1",
          productLabel: selectedCustomer.vehicle,
          reason: `Record completed sale packet for ${selectedCustomer.customer}.`,
          revenueLane: selectedLane.contractLane,
          revenueOpportunityId: `REV-${selectedCustomer.stock}`,
          saleDate: new Date().toISOString().slice(0, 10),
          salesOpportunityId: `SO-${selectedCustomer.stock}`,
          salespersonId: "USER-1",
          satisfied: [...salesConsoleSampleRecordSaleDraft.satisfied, "evidence-attached"],
          sourceRecordLinks: [getSalesConsoleCustomer360Href(selectedCustomer.customer), getSalesConsoleVehicle360Href(selectedCustomer.stock)],
          vehicleStockNumber: selectedCustomer.stock
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const result = await response.json().catch(() => null) as { error?: string; saleRecord?: { id: string }; status?: string } | null;
      if (!response.ok || !result?.saleRecord) {
        setRecordSaleStatus(result?.error ?? "Unable to initiate the internal sale record.");
        return;
      }

      setRecordSaleStatus(`${result.status === "duplicate" ? "Already recorded" : "Recorded"} internally as ${result.saleRecord.id}. Source systems were not changed.`);
    });
  }

  return (
    <main className={styles.console} aria-label="Elite enterprise Sales Console operational MVP">
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>TMS</div>
          <div>
            <strong>Sales Console</strong>
            <span>Enterprise Sales</span>
          </div>
        </div>

        <div className={styles.salesMode}>
          <span />
          <strong>Enterprise Sales</strong>
          <em>Operational MVP</em>
        </div>

        <nav className={styles.nav} aria-label="Sales Console navigation">
          {navigation.map((item) => (
            <button
              key={item}
              type="button"
              className={item === activeNav ? styles.activeNav : undefined}
              onClick={() => setActiveNav(item)}
              aria-pressed={item === activeNav}
            >
              {item}
            </button>
          ))}
        </nav>

        <section className={styles.actionKey} aria-label="Action key">
          <h2>Action Key</h2>
          {Object.keys(actionTone).map((state) => (
            <p key={state}>
              <span className={actionTone[state as ActionState]} />
              <strong>{state}</strong>
            </p>
          ))}
        </section>
      </aside>

      <section className={styles.main}>
        <header className={styles.topbar}>
          <label className={styles.search}>
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customer, stock #, VIN, phone, deal..."
              type="search"
            />
          </label>
          <button type="button">TMS-001</button>
          <select
            aria-label="Role context"
            className={styles.roleSelect}
            value={activeRole}
            onChange={(event) => {
              const nextRole = event.target.value as StaffRole;
              setActiveRole(nextRole);
              setActiveNav(roleLanding[nextRole]);
            }}
          >
            {Object.keys(roleLanding).map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
          <button type="button" onClick={() => setActiveNav(sourceHealthNav)}>
            Source Health 98%
          </button>
        </header>
        <section className={styles.integrationStrip} aria-label="Dispatch Board source links">
          {salesConsoleCrossConsoleNavigationTargets
            .filter((target) => target.visibleToRoles.includes(activeRole))
            .slice(0, 5)
            .map((target) => (
              <a key={target.destination} href={target.href}>
                <strong>{target.label}</strong>
                <span>{target.writeAuthority}</span>
              </a>
            ))}
        </section>
        {query.trim() ? (
          <section className={styles.searchTray} aria-label="Sales Console search results">
            <header>
              <strong>{searchResults.length ? `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}` : "No matching records"}</strong>
              <button type="button" onClick={() => setQuery("")}>Clear search</button>
            </header>
            {searchResults.length ? (
              searchResults.map((result) => (
                <button key={result.id} type="button" onClick={() => openSearchResult(result)}>
                  <span>
                    <strong>{result.title}</strong>
                    <em>{result.detail}</em>
                  </span>
                  <small>{result.category} · Source: {result.sourceOwner} · Score {result.matchScore}</small>
                </button>
              ))
            ) : (
              <p>Search is live over the current Sales Console source-shaped records. No record matched this term.</p>
            )}
          </section>
        ) : null}

        {activeNav === salesIntentHomeNav ? (
          <section className={styles.intentHome} aria-labelledby="sales-intent-title">
            <section className={styles.intentHero}>
              <span>Sales intent home</span>
              <h1 id="sales-intent-title">What are you trying to do?</h1>
              <p>
                Choose the selling intent first. The console will then show the customer context, required facts,
                lifecycle stage, recommended next action, and the correct workspace without making staff hunt
                through pages.
              </p>
              <strong>Click any intent to open that guided workspace.</strong>
            </section>

            <section className={styles.intentGrid} aria-label="Sales starting intents">
              {salesIntents.map((intent) => (
                <button
                  key={intent.id}
                  type="button"
                  className={intent.id === activeIntent.id ? styles.activeIntent : undefined}
                  onClick={() => openSalesIntent(intent)}
                  aria-pressed={intent.id === activeIntent.id}
                >
                  <strong>{intent.title}</strong>
                  <span>{intent.purpose}</span>
                  <em>Open {intent.startsWith}</em>
                </button>
              ))}
            </section>

            <section className={styles.intentDetail} aria-label="Selected sales intent workflow">
              <div className={styles.intentSummary}>
                <span>Selected intent</span>
                <h2>{activeIntent.title}</h2>
                <p>{activeIntent.nextAction}</p>
                <button type="button" onClick={() => openSalesIntent(activeIntent)}>
                  Begin guided path
                </button>
              </div>
              <div className={styles.intentFacts}>
                <h3>Required facts before action</h3>
                <ul>
                  {activeIntent.requiredFacts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.intentSteps}>
                <h3>Workflow that unfolds next</h3>
                <ol>
                  {activeIntent.workflow.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <div className={styles.intentGuardrail}>
                <h3>Source of truth</h3>
                <p>{activeIntent.sourceTruth}</p>
                <strong>No fabricated activity, metrics, or recommendations.</strong>
              </div>
            </section>
          </section>
        ) : (
          <>
        {activeNav === revenueWorkQueueNav || activeNav === enterpriseDashboardNav ? (
          <section className={styles.queueStats} aria-label="Revenue Work Queue source-backed summary">
            {queueStats.map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={() => {
                  setQueueGroupFilter(stat.filter);
                  setActiveNav(revenueWorkQueueNav);
                }}
              >
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <em>{stat.detail}</em>
              </button>
            ))}
            <button type="button" onClick={() => setActiveNav(enterpriseDashboardNav)}>
              <span>Enterprise Dashboard</span>
              <strong>Open</strong>
              <em>Optional leadership view</em>
            </button>
          </section>
        ) : null}

        <div className={activeNav === enterpriseDashboardNav ? styles.workspace : styles.focusWorkspace}>
          <section className={styles.operatingArea}>
            {activeNav === revenueWorkQueueNav || activeNav === enterpriseDashboardNav ? (
            <section className={styles.workQueue}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>{activeWorkspace.title}</h1>
                  <p>{query ? `Filtered by "${query}"` : activeWorkspace.description}</p>
                </div>
                <div className={styles.filters}>
                  <select value={queueGroupFilter} onChange={(event) => setQueueGroupFilter(event.target.value)} aria-label="Priority filter">
                    <option>All Priorities</option>
                    {queueGroups.map((group) => (
                      <option key={group}>{group}</option>
                    ))}
                  </select>
                  <select value={laneFilter} onChange={(event) => setLaneFilter(event.target.value)} aria-label="Lane filter">
                    <option>All Lanes</option>
                    {salesConsoleLiveRevenueLanes.map((lane) => (
                      <option key={lane.name}>{lane.name}</option>
                    ))}
                  </select>
                  <select value={queueSourceFilter} onChange={(event) => setQueueSourceFilter(event.target.value)} aria-label="Source filter">
                    <option>All Sources</option>
                    {queueSources.map((source) => (
                      <option key={source}>{source}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setLaneFilter("All Lanes");
                      setQueueGroupFilter("All Priorities");
                      setQueueSourceFilter("All Sources");
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className={styles.queueTruth} aria-label="Revenue Work Queue source truth">
                <strong>{filteredWork.length} source-backed record{filteredWork.length === 1 ? "" : "s"}</strong>
                <span>Ranked by urgency, value, readiness, blocker risk, freshness, and next action.</span>
                <span>Every row opens the selected customer/deal workspace.</span>
              </div>
              {activeNav === "Leads" ? (
                <section className={styles.leadOperations} aria-label="Lead Operations workspace">
                  <div className={styles.leadGrid}>
                    {salesConsoleLiveLeadRecords.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        className={selectedLead.id === lead.id ? styles.selectedLead : undefined}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <strong>{lead.customer}</strong>
                        <span>{lead.state} · {lead.source} · SLA {lead.sla}</span>
                        <span>Owner: {lead.owner} · Channel: {lead.preferredChannel}</span>
                        <span>{lead.vehicleInterest} · {lead.financingIntent}</span>
                        <span>Algorithm: {lead.workflowDecision.slaRisk} SLA · {lead.workflowDecision.routingRecommendation}</span>
                      </button>
                    ))}
                  </div>
                  <aside className={styles.leadDetail}>
                    <strong>{selectedLead.id}: {selectedLead.customer}</strong>
                    <span>Duplicate risk: {selectedLead.duplicateRisk}</span>
                    <span>Workflow dedupe: {selectedLead.workflowDecision.dedupeRisk}</span>
                    <span>Routing recommendation: {selectedLead.workflowDecision.routingRecommendation}</span>
                    <span>Next action: {selectedLead.nextAction}</span>
                    <span>Escalation: {selectedLead.workflowDecision.escalationTriggers.join(", ") || "none"}</span>
                    <span>Assignment: {selectedLead.workflowDecision.assignmentRecommendation}; controlled until backend command approval</span>
                    <a href={getSalesConsoleCustomer360Href(selectedLead.customer)}>Open linked Customer 360</a>
                    <a href={withSalesConsoleReturnTo("/appointments")}>Open related appointments</a>
                  </aside>
                </section>
              ) : null}
              {activeNav === "Pipeline" || activeNav === "Customers" ? (
                <section className={styles.pipelinePanel} aria-label="Pipeline and Customer 360 workspace">
                  {salesConsolePipelineRecords.map((record) => (
                    <article
                      key={record.id}
                    >
                      <strong>{record.customer}</strong>
                      <span>{record.lane} · {record.stage} · {record.age}</span>
                      <span>Owner: {record.owner} · Freshness: {record.freshness} · Blocker: {record.blocker}</span>
                      <span>Forecast: {record.forecastBand} · Source: {record.source}</span>
                      <span>Lead score: {record.leadScore} · Funnel: {record.funnelSignal}</span>
                      <span>Next-best customer action: {record.nextBestCustomerAction}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const matched = salesConsoleLiveWorkItems.find((item) => item.customer === record.customer);
                          if (matched) setSelectedCustomer(matched);
                        }}
                      >
                        Select sales context
                      </button>
                      <a href={getSalesConsoleCustomer360Href(record.customer)}>Open Customer 360 source</a>
                    </article>
                  ))}
                </section>
              ) : null}
              {["Appointments", "Tasks & Promises", "Delivery Readiness"].includes(activeNav) ? (
                <section className={styles.supportPanel} aria-label={`${activeNav} operating support`}>
                  {(activeNav === "Appointments" ? salesConsoleLiveAppointments : activeNav === "Tasks & Promises" ? salesConsoleLiveTasksAndPromises : salesConsoleDeliveryReadiness).map((record) => (
                    <article key={"id" in record ? record.id : record.deal}>
                      <strong>{"label" in record ? record.label : "title" in record ? record.title : record.deal}</strong>
                      <span>{Object.entries(record).map(([key, value]) => `${key}: ${value}`).join(" · ")}</span>
                      <em>Write behavior: controlled or source-system owned</em>
                      {"sourceLink" in record ? <a href={getSalesConsoleAppointmentHref(record.id)}>Open appointment source</a> : null}
                      {"sourceTaskLink" in record ? <a href={getSalesConsoleTaskHref(record.id)}>Open task source</a> : null}
                      {"deal" in record ? <a href="/sales?workspace=delivery-readiness">Open delivery context</a> : null}
                    </article>
                  ))}
                </section>
              ) : null}
              {activeNav === "Admin / Source Health" ? (
                <section className={styles.releasePanel} aria-label="MVP release readiness">
                  <div>
                    <h2>MVP Release Readiness</h2>
                    <p>
                      Admin-only connected MVP gate: {salesConsoleM64ReadyCount()} of {salesConsoleM64ConnectedMvpGate.length} areas
                      are ready, guarded, or source-controlled; {salesConsoleRolloutHardeningPassCount()} rollout checks pass;
                      final MVP gate {salesConsoleMvpRolloutGatePassCount()} of {salesConsoleMvpRolloutGateItems.length}.
                    </p>
                  </div>
                  <div className={styles.releaseGrid}>
                    {salesConsoleMvpAcceptanceChecklist.map((item) => (
                      <span key={item}>✓ {item}</span>
                    ))}
                  </div>
                  <div className={styles.sourceGrid}>
                    {salesConsoleM64ConnectedMvpGate.map((item) => (
                      <article key={item.area}>
                        <strong>{item.area}</strong>
                        <span>{item.status}</span>
                        <em>{item.owner}: {item.evidence}</em>
                      </article>
                    ))}
                    {salesConsoleSourceHealthSummary.map((source) => (
                      <article key={source.source}>
                        <strong>{source.source}</strong>
                        <span>{source.status}</span>
                        <em>{source.owner}</em>
                      </article>
                    ))}
                    {salesConsoleCrossConsoleNavigationTargets.map((target) => (
                      <article key={target.destination}>
                        <strong>{target.destination}</strong>
                        <span>{target.behavior}</span>
                        <em>
                          <a href={target.href}>{target.label}</a> · {target.writeAuthority}
                        </em>
                      </article>
                    ))}
                    {salesConsoleRolloutHardeningChecks.map((check) => (
                      <article key={check.id}>
                        <strong>{check.label}</strong>
                        <span>{check.status}</span>
                        <em>{check.evidence}</em>
                      </article>
                    ))}
                    {salesConsoleMvpRolloutGateItems.map((item) => (
                      <article key={item.id}>
                        <strong>{item.label}</strong>
                        <span>{item.passed ? "pass" : "blocked"}</span>
                        <em>{item.evidence}</em>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
              {activeNav === "Reports & Forecast" || activeNav === "Admin / Source Health" ? (
                <section className={styles.releasePanel} aria-label="Sales Book ledger">
                  <div>
                    <h2>Sales Book Ledger</h2>
                    <p>
                      {salesBookLedger.units} completed sale record{salesBookLedger.units === 1 ? "" : "s"} visible for {salesBookLedger.role};
                      estimated gross ${(salesBookLedger.grossEstimateCents / 100).toLocaleString()}.
                    </p>
                  </div>
                  <div className={styles.releaseGrid}>
                    <span>Today: {salesBookLedger.todayUnits} units</span>
                    <span>MTD: {salesBookLedger.monthToDateUnits} units</span>
                    <span>Pending reconciliation: {salesBookLedger.pendingReconciliation}</span>
                    <span>Missing evidence: {salesBookLedger.missingEvidence}</span>
                    <span>Source mismatch: {salesBookLedger.sourceMismatch}</span>
                    <span>Corrections needed: {salesBookLedger.voidOrCorrectionNeeded}</span>
                  </div>
                  <div className={styles.sourceGrid}>
                    {salesBookLedger.visibleRecords.map((record) => (
                      <article key={record.id}>
                        <strong>{record.customerName}</strong>
                        <span>{record.revenueLane} · ${(record.grossEstimateCents / 100).toLocaleString()}</span>
                        <em>{record.reconciliationStatus} · {record.evidenceIds.length} evidence file{record.evidenceIds.length === 1 ? "" : "s"}</em>
                      </article>
                    ))}
                    {salesConsoleSampleReconciliationQueue.map((record) => (
                      <article key={record.id}>
                        <strong>Reconcile {record.completedSaleRecordId}</strong>
                        <span>{record.status} · {record.sourceOwners.join(", ")}</span>
                        <em>{record.routingLabel} · source correction writes disabled</em>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
              <div className={styles.workspaceContract} aria-label="Active workspace operating contract">
                <span><strong>{activeRole}</strong> role context</span>
                <span><strong>{activeWorkspace.primaryMetric}</strong></span>
                <span>{activeWorkspace.allowed}</span>
                <span>{activeWorkspace.governed}</span>
              </div>
              {activeSourceBackedState ? (
                <div className={styles.sourceBackedState} aria-label="Active source-backed state">
                  <strong>{activeSourceBackedState.status}</strong>
                  <span>{activeSourceBackedState.recordCount} source-backed record{activeSourceBackedState.recordCount === 1 ? "" : "s"}</span>
                  <span>{activeSourceBackedState.staffMessage}</span>
                  {activeSourceBackedState.sourceLinks.slice(0, 3).map((link) => (
                    <a key={link} href={link}>Open source</a>
                  ))}
                </div>
              ) : null}

              <div className={styles.table} role="table" aria-label="Ranked sales work queue">
                <div className={styles.tableHead} role="row">
                  <span>Rank</span>
                  <span>Customer / Opportunity</span>
                  <span>Lane</span>
                  <span>Stage</span>
                  <span>Freshness</span>
                  <span>Blockers</span>
                  <span>Next Best Action</span>
                  <span>Action</span>
                </div>
                {groupedWork.map(({ group, items }) => (
                  <div key={group} className={styles.workGroup} role="rowgroup" aria-label={`${group} work`}>
                    <div className={styles.workGroupHeader}>{group} · {items.length} item{items.length === 1 ? "" : "s"}</div>
                    {items.length ? items.map((item) => (
                      <article
                        key={`${item.customer}-${item.stock}`}
                        className={`${styles.tableRow} ${selectedCustomer.customer === item.customer ? styles.selectedRow : ""}`}
                      >
                        <span>{item.rank}</span>
                        <span>
                          <strong>{item.customer}</strong>
                          <em>{item.vehicle} · Stock #{item.stock}</em>
                          <em>{item.reason}</em>
                          <em title={item.algorithmReasons.join(", ")}>
                            Score {item.algorithmScore} · {item.algorithmReasons.length} signals · Revenue {item.componentScores.revenueOpportunity} · SLA {item.componentScores.taskSlaRisk}
                          </em>
                          <em className={styles.sourceLinkRow}>
                            <a href={getSalesConsoleCustomer360Href(item.customer)}>Customer 360</a>
                            <a href={getSalesConsoleVehicle360Href(item.stock)}>Vehicle 360</a>
                            {getSalesConsoleCrossConsoleLinksForLane(item.contractLane, activeRole).slice(0, 3).map((link) => (
                              <a key={`${item.stock}-${link.destination}`} href={link.href}>{link.label}</a>
                            ))}
                          </em>
                        </span>
                        <span className={styles.laneChip}>{item.lane}</span>
                        <span>{item.stage}</span>
                        <span className={styles.freshness}>{item.freshness}</span>
                        <span>{item.blockers.length ? item.blockers.join(", ") : "Clear"}</span>
                        <span>{item.nextAction}</span>
                        <span>
                          <button type="button" className={actionTone[item.actionState]} onClick={() => openQueueItem(item)}>{item.action}</button>
                        </span>
                      </article>
                    )) : (
                      <p className={styles.emptyGroup}>No {group.toLowerCase()} records match the current search or lane filter.</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
            ) : null}

            {activeNav === enterpriseDashboardNav ? (
              <>
            <section className={styles.revenueDesk} aria-label="Revenue Desk lanes">
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Revenue Desk</h2>
                  <p>Lane-aware selling workflows for every Time Motor Sales revenue stream.</p>
                </div>
              </div>
              <div className={styles.laneGrid}>
                {salesConsoleLiveRevenueLanes.map((lane) => (
                  <article
                    key={lane.name}
                    className={`${styles.laneCard} ${selectedLane.name === lane.name ? styles.selectedLane : ""}`}
                  >
                    <strong>{lane.name}</strong>
                    <span>Stage: {lane.stage}</span>
                    <span>Owner: {lane.owner}</span>
                    <span>Next: {lane.workflowDecision.nextAction}</span>
                    <span>Manager review: {lane.workflowDecision.managerReviewRequired ? "required" : "not required"}</span>
                    <span>Sources: {getSalesConsoleCrossConsoleLinksForLane(lane.contractLane, activeRole).map((link) => link.destination).join(", ")}</span>
                    <button type="button" className={actionTone[lane.status]} onClick={() => setSelectedLane(lane)}>{lane.status}</button>
                  </article>
                ))}
              </div>
              {selectedLaneContract ? (
                <section className={styles.revenueLaneDetail} aria-label="Selected Revenue Desk lane detail">
                  <div>
                    <h3>{selectedLaneContract.lane}</h3>
                    <p>{selectedLane.stage} · Owner {selectedLane.owner} · Next: {selectedLane.nextAction}</p>
                    <p>Workflow engine: {selectedLane.workflowDecision.nextAction}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Dispatch Board links</dt>
                      <dd>
                        <span className={styles.sourceLinkRow}>
                          {selectedLaneLinks.map((link) => (
                            <a key={link.destination} href={link.href}>{link.label}</a>
                          ))}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Required fields</dt>
                      <dd>{selectedLaneContract.requiredFields.join(", ")}</dd>
                    </div>
                    <div>
                      <dt>Source systems</dt>
                      <dd>{selectedLaneContract.sourceOwners.join(", ")}</dd>
                    </div>
                    <div>
                      <dt>Allowed MVP actions</dt>
                      <dd>{selectedLaneContract.allowedMvpActions.join(", ")}</dd>
                    </div>
                    <div>
                      <dt>Workflow decision</dt>
                      <dd>
                        Missing: {selectedLane.workflowDecision.missingFields.join(", ") || "none"} ·
                        Review: {selectedLane.workflowDecision.managerReviewRequired ? "required" : "not required"} ·
                        Advance inside console: {selectedLane.workflowDecision.canAdvanceInsideSalesConsole ? "yes" : "no"}
                      </dd>
                    </div>
                    <div>
                      <dt>Governed actions</dt>
                      <dd>{selectedLaneContract.governedActions.join(", ")}</dd>
                    </div>
                  </dl>
                </section>
              ) : null}
            </section>

            <section className={styles.inventory} aria-label="Inventory Intelligence">
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Inventory Intelligence</h2>
                  <p>Vehicle fit, readiness, market pressure, age, availability, and alternatives.</p>
                </div>
              </div>
              <div className={styles.inventoryGrid}>
                {salesConsoleLiveInventoryMatches.map((vehicle) => (
                  <article
                    key={vehicle.stock}
                    className={`${styles.vehicleCard} ${selectedInventory.stock === vehicle.stock ? styles.selectedInventory : ""}`}
                  >
                    <div className={styles.vehicleImage}>Vehicle</div>
                    <strong>{vehicle.vehicle}</strong>
                    <span>Stock #{vehicle.stock}</span>
                    <p>Readiness: {vehicle.readiness} · Market: {vehicle.marketPressure}</p>
                    <p>Age: {vehicle.age} · Retail {vehicle.retail} · Gross {vehicle.gross}</p>
                    <p>Availability: {vehicle.availability} · Blocker: {vehicle.blocker}</p>
                    <p>{vehicle.fitReason}</p>
                    <p>Match score {vehicle.matchScore} · Sellability {vehicle.sellability}</p>
                    <p>Revenue lanes: {vehicle.revenueLaneSignals.join(", ")}</p>
                    <p>{vehicle.laneRoutingExplanation.join("; ") || vehicle.revenueRoute}</p>
                    <p>{vehicle.blockerExplanation.join("; ") || "No algorithm blocker"}</p>
                    <button type="button" onClick={() => setSelectedInventory(vehicle)}>Select vehicle match</button>
                    <a href={getSalesConsoleVehicle360Href(vehicle.stock)}>Open Vehicle 360 source</a>
                  </article>
                ))}
              </div>
              <div className={styles.alternatives} aria-label="Alternative inventory recommendations">
                <strong>Alternative Recommendations</strong>
                <span>Selected: {selectedInventory.vehicle} · Holds/reservations governed</span>
                {salesConsoleInventoryAlternatives.map((alternative) => (
                  <span key={alternative}>{alternative}</span>
                ))}
              </div>
            </section>
              </>
            ) : null}

            {activeNav === guidedWorkspaceNav || activeNav === enterpriseDashboardNav ? (
            <section className={styles.customer360} aria-label="Customer 360">
              <div className={styles.truthHeader}>
                <span>Customer Truth Source</span>
                <h2>Customer 360</h2>
                <strong>{selectedCustomer.customer}</strong>
                <p>{selectedCustomer.contact} · {salesConsoleLiveCustomer360.consentLabel} · Source: {salesConsoleLiveCustomer360.sourceLink}</p>
                <p>Customer 360 remains the record and history. Sales Workbench below is where staff executes the next revenue action.</p>
              </div>
              <section className={styles.guidedPath} aria-label="Sales Workbench">
                <header>
                  <span>Sales Workbench</span>
                  <h3>{selectedGuidedPath.workbenchTitle}</h3>
                  <p>
                    {selectedGuidedPath.workbenchInstruction} · {selectedGuidedPath.revenueLane} · Source: {selectedGuidedPath.sourceSystem}
                  </p>
                </header>
                <section className={styles.workspaceRelationship} aria-label="How Sales Workbench and Customer 360 work together">
                  <article>
                    <strong>Customer 360</strong>
                    <span>{selectedGuidedPath.relationshipContract.truthWorkspace}</span>
                  </article>
                  <article>
                    <strong>Sales Workbench</strong>
                    <span>{selectedGuidedPath.relationshipContract.executionWorkspace}</span>
                  </article>
                  <article>
                    <strong>Integration</strong>
                    <span>{selectedGuidedPath.relationshipContract.integrationPattern}</span>
                  </article>
                  <article>
                    <strong>Write-back rule</strong>
                    <span>{selectedGuidedPath.relationshipContract.writeBackRule}</span>
                  </article>
                </section>
                <section className={styles.workbenchActionPanel} aria-label="What staff should do now">
                  <div className={styles.workbenchNow}>
                    <span>Do this now</span>
                    <h4>{selectedGuidedPath.emphasizedAction}</h4>
                    <p>{selectedGuidedPath.staffDecision}</p>
                    <button
                      type="button"
                      className={actionTone[selectedGuidedPath.primaryTool.state]}
                      onClick={() => openWorkbenchHref(selectedGuidedPath.primaryTool.href)}
                    >
                      {selectedGuidedPath.primaryTool.label}
                    </button>
                    <small>{selectedGuidedPath.primaryTool.behavior} · {selectedGuidedPath.writeBackBehavior}</small>
                  </div>
                  <div className={styles.workbenchToolBelt} aria-label="Execution tools">
                    <h4>Tools for this step</h4>
                    <div>
                      {selectedGuidedPath.executionTools.map((tool) => (
                        <button
                          key={tool.label}
                          type="button"
                          className={actionTone[tool.state]}
                          disabled={!tool.enabled}
                          onClick={() => openWorkbenchHref(tool.href)}
                          title={tool.disabledReason ?? `${tool.purpose} Source: ${tool.source}`}
                        >
                          <strong>{tool.label}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.workbenchFinish} aria-label="Finish the action">
                    <h4>Finish before moving on</h4>
                    <p>Capture what happened so the next step is clear and Customer 360 stays truthful.</p>
                    <div>
                      {selectedGuidedPath.outcomeOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          disabled={isWorkbenchOutcomePending}
                          onClick={() => saveWorkbenchOutcome(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    {workbenchOutcomeStatus ? <small role="status">{workbenchOutcomeStatus}</small> : null}
                  </div>
                </section>
                <section className={styles.lifecycleWorkbench} aria-label="Sales lifecycle movement">
                  <div>
                    <span>Lifecycle</span>
                    <h4>{selectedGuidedPath.lifecycleStage}</h4>
                    <p>Move this record forward only when the required facts and outcome are captured.</p>
                  </div>
                  <ol className={styles.lifecyclePath} aria-label="CRM lifecycle stage">
                    {selectedGuidedPath.lifecycleSteps.map((step) => (
                      <li key={step.label} className={styles[`lifecycle${step.status.replaceAll(" ", "")}`]}>
                        <strong>{step.label}</strong>
                        <span>{step.status}</span>
                        <em>{step.meaning}</em>
                        <small>{step.unlocks}</small>
                      </li>
                    ))}
                  </ol>
                </section>
                <div className={styles.guidedPathBody}>
                  <section className={styles.requiredFacts} aria-label="Required facts before action">
                    <h4>Required facts before action</h4>
                    {selectedGuidedPath.requiredFacts.map((fact) => (
                      <article key={fact.label}>
                        <strong>{fact.label}</strong>
                        <span>{fact.value}</span>
                        <em>{fact.status} · {fact.source}</em>
                      </article>
                    ))}
                  </section>
                  <section className={styles.nextGuidedAction} aria-label="Current guided action">
                    <span>Why this is next</span>
                    <h4>{selectedGuidedPath.nextStep}</h4>
                    <p>{selectedGuidedPath.reason}</p>
                    <dl>
                      <div>
                        <dt>Staff decision</dt>
                        <dd>{selectedGuidedPath.staffDecision}</dd>
                      </div>
                      <div>
                        <dt>Next step</dt>
                        <dd>{selectedGuidedPath.nextStep}</dd>
                      </div>
                      <div>
                        <dt>Write-back behavior</dt>
                        <dd>{selectedGuidedPath.writeBackBehavior}</dd>
                      </div>
                    </dl>
                    <button type="button" className={actionTone[selectedCustomer.actionState]}>{selectedGuidedPath.nextStep}</button>
                    <small>{selectedGuidedPath.activityPolicy}</small>
                  </section>
                </div>
                <details className={styles.deeperTools}>
                  <summary>Show deeper tools only when needed</summary>
                  <div>
                    {selectedGuidedPath.collapsedTools.map((tool) => (
                      <span key={tool}>{tool}</span>
                    ))}
                  </div>
                </details>
              </section>
              <div className={styles.customerCards}>
                <article>
                  <strong>Active Opportunity</strong>
                  <span>{selectedCustomer.vehicle}</span>
                  <em>{selectedCustomer.lane} · {selectedCustomer.stage}</em>
                  <a href={getSalesConsoleVehicle360Href(selectedCustomer.stock)}>Open Vehicle 360</a>
                </article>
                <article>
                  <strong>Selected Revenue Lane</strong>
                  <span>{selectedLane.name}</span>
                  <em>{selectedLane.status}</em>
                  <a href={getSalesConsoleCrossConsoleLinksForLane(selectedLane.contractLane, activeRole)[0]?.href ?? "/sales"}>Open primary source</a>
                </article>
                <article>
                  <strong>Next Promise</strong>
                  <span>{selectedCustomer.nextAction}</span>
                  <em>On Track</em>
                </article>
                <article>
                  <strong>Documents</strong>
                  <span>{salesConsoleLiveCustomer360.documentsAndPromises.join(", ")}</span>
                  <em>Source labeled · Freshness {salesConsoleLiveCustomer360.freshness}</em>
                  <a href={getSalesConsoleCustomer360Href(selectedCustomer.customer)}>Open Customer 360</a>
                </article>
                <article>
                  <strong>Activity Workflow</strong>
                  <span>{salesConsoleLiveActivityDecision.commandName ?? "blocked"}</span>
                  <em>{salesConsoleLiveActivityDecision.allowed ? "Audit-ready internal record" : salesConsoleLiveActivityDecision.reasons.join(", ")}</em>
                </article>
                <article>
                  <strong>Evidence Intake</strong>
                  <span>{salesConsoleLiveEvidenceRecord?.fileName ?? "No evidence record"}</span>
                  <em>{salesConsoleLiveEvidenceValidation.allowed ? "Guarded upload ready" : salesConsoleLiveEvidenceValidation.reasons.join(", ")}</em>
                </article>
                <article>
                  <strong>Outcome Recording</strong>
                  <span>{salesConsoleLiveOutcomeDecision.terminal ? "Terminal outcome" : "Next-action outcome"}</span>
                  <em>{salesConsoleLiveOutcomeDecision.allowed ? "Controlled Sales Console record" : salesConsoleLiveOutcomeDecision.reasons.join(", ")}</em>
                </article>
                <article>
                  <strong>Record Completed Sale</strong>
                  <span>{recordSaleWorkflowState.readinessScore}% ready · {recordSaleWorkflowState.submitLabel}</span>
                  <em>{recordSaleWorkflowState.reason}</em>
                  <small>
                    Missing: {recordSaleWorkflowState.missingLabels.join(", ") || "none"} ·
                    Source verify: {recordSaleWorkflowState.sourceVerificationRequired ? "required" : "ready"} ·
                    Manager review: {recordSaleWorkflowState.managerReviewRequired ? "required" : "not required"}
                  </small>
                  <button
                    type="button"
                    className={actionTone[recordSaleWorkflowState.submitEnabled ? "Controlled Action" : "Future / Governed"]}
                    disabled={!recordSaleWorkflowState.submitEnabled || isRecordSalePending}
                    onClick={submitSelectedSaleRecord}
                  >
                    {isRecordSalePending ? "Recording..." : "Initiate internal sale record"}
                  </button>
                  {recordSaleStatus ? <small>{recordSaleStatus}</small> : null}
                </article>
                <article>
                  <strong>After Sale Execution</strong>
                  <span>{postSaleExecutionWorkflow.nextBestStep}</span>
                  <em>{postSaleExecutionWorkflow.steps.length} lane-aware steps · source systems stay owners</em>
                  <small>
                    {postSaleExecutionWorkflow.steps.slice(0, 3).map((step) => `${step.label} (${step.status})`).join(" · ")}
                  </small>
                </article>
              </div>
            </section>
            ) : null}

            {activeNav === sourceHealthNav ? (
              <section className={styles.releasePanel} aria-label="Source Health">
                <div>
                  <h2>Source Health</h2>
                  <p>
                    Admin-only connected MVP gate: {salesConsoleM64ReadyCount()} of {salesConsoleM64ConnectedMvpGate.length} areas
                    are ready, guarded, or source-controlled; {salesConsoleRolloutHardeningPassCount()} rollout checks pass;
                    final MVP gate {salesConsoleMvpRolloutGatePassCount()} of {salesConsoleMvpRolloutGateItems.length}.
                  </p>
                </div>
                <div className={styles.releaseGrid}>
                  {salesConsoleMvpAcceptanceChecklist.map((item) => (
                    <span key={item}>✓ {item}</span>
                  ))}
                </div>
                <div className={styles.sourceGrid}>
                  {salesConsoleM64ConnectedMvpGate.map((item) => (
                    <article key={item.area}>
                      <strong>{item.area}</strong>
                      <span>{item.status}</span>
                      <em>{item.owner}: {item.evidence}</em>
                    </article>
                  ))}
                  {salesConsoleSourceHealthSummary.map((source) => (
                    <article key={source.source}>
                      <strong>{source.source}</strong>
                      <span>{source.status}</span>
                      <em>{source.owner}</em>
                    </article>
                  ))}
                  {salesConsoleCrossConsoleNavigationTargets.map((target) => (
                    <article key={target.destination}>
                      <strong>{target.destination}</strong>
                      <span>{target.behavior}</span>
                      <em>
                        <a href={target.href}>{target.label}</a> · {target.writeAuthority}
                      </em>
                    </article>
                  ))}
                  {salesConsoleRolloutHardeningChecks.map((check) => (
                    <article key={check.id}>
                      <strong>{check.label}</strong>
                      <span>{check.status}</span>
                      <em>{check.evidence}</em>
                    </article>
                  ))}
                  {salesConsoleMvpRolloutGateItems.map((item) => (
                    <article key={item.id}>
                      <strong>{item.label}</strong>
                      <span>{item.passed ? "pass" : "blocked"}</span>
                      <em>{item.evidence}</em>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </section>

          {activeNav === enterpriseDashboardNav ? (
          <aside className={styles.managerRail} aria-label="Manager Command Center">
            <h2>Manager Command Center</h2>
            {salesConsoleLiveManagerQueues.map((signal) => (
              <article
                key={signal.title}
                className={`${styles.signal} ${selectedManagerQueue.title === signal.title ? styles.selectedSignal : ""}`}
              >
                <header>
                  <strong>{signal.title}</strong>
                  <span>{signal.count}</span>
                </header>
                {signal.drilldowns.slice(0, 3).map((item) => (
                  <p key={item}>{item}</p>
                ))}
                <em>{signal.algorithmSource}</em>
                <div className={styles.railActionRow}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedManagerQueue(signal);
                      setActiveNav("Manager Command");
                    }}
                  >
                    Open queue
                  </button>
                  <a href="/sales?workspace=manager-command">Source context</a>
                </div>
              </article>
            ))}

            <section className={styles.forecast}>
              <h3>Selected Drilldown</h3>
              <strong>{selectedManagerQueue.count}</strong>
              <p>{selectedManagerQueue.drilldowns.join(" · ")}</p>
            </section>
          </aside>
          ) : null}
        </div>
          </>
        )}
      </section>
    </main>
  );
}
