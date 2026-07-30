"use client";

import { useMemo, useState } from "react";

import { salesConsoleMvpAcceptanceChecklist, salesConsoleSourceHealthSummary } from "./sales-console-mvp-release-hardening";
import { salesConsoleM64ConnectedMvpGate, salesConsoleM64ReadyCount } from "./sales-console-m64-connected-mvp-deployment-gate";
import {
  getSalesConsoleAppointmentHref,
  getSalesConsoleCrossConsoleLinksForLane,
  getSalesConsoleCustomer360Href,
  getSalesConsoleTaskHref,
  getSalesConsoleVehicle360Href,
  salesConsoleCrossConsoleNavigationTargets
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
  searchSalesConsoleLiveExperience,
  type SalesConsoleLiveActionState,
  type SalesConsoleLiveWorkItem
} from "./sales-console-live-workflow-engine";
import { salesConsolePipelineRecords } from "./sales-console-pipeline-customer360";
import type { SalesFederatedSearchResult } from "./sales-console-m57-federated-search";
import styles from "./sales-console-elite-operating-console.module.css";

type ActionState = SalesConsoleLiveActionState;
type WorkItem = SalesConsoleLiveWorkItem;

type StaffRole = "Salesperson" | "BDC / Lead Coordinator" | "Sales Manager" | "Admin / Owner";

type WorkspaceSummary = {
  title: string;
  description: string;
  primaryMetric: string;
  allowed: string;
  governed: string;
};

const navigation = [
  "Today",
  "Leads",
  "Pipeline",
  "Customers",
  "Revenue Desk",
  "Inventory Intelligence",
  "Appointments",
  "Tasks & Promises",
  "Finance Handoff",
  "Delivery Readiness",
  "Manager Command",
  "Reports & Forecast",
  "Admin / Source Health"
];

const roleLanding: Record<StaffRole, string> = {
  "Salesperson": "Today",
  "BDC / Lead Coordinator": "Leads",
  "Sales Manager": "Manager Command",
  "Admin / Owner": "Admin / Source Health"
};

const workspaceSummaries: Record<string, WorkspaceSummary> = {
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

const actionTone: Record<ActionState, string> = {
  "Live Action": styles.live,
  "Controlled Action": styles.controlled,
  "Source-System Action": styles.source,
  "Future / Governed": styles.future
};

export function SalesConsoleEliteOperatingConsole() {
  const [activeNav, setActiveNav] = useState("Today");
  const [activeRole, setActiveRole] = useState<StaffRole>("Sales Manager");
  const [query, setQuery] = useState("");
  const [laneFilter, setLaneFilter] = useState("All Lanes");
  const [selectedCustomer, setSelectedCustomer] = useState(salesConsoleLiveWorkItems[0]);
  const [selectedLane, setSelectedLane] = useState(salesConsoleLiveRevenueLanes[0]);
  const [selectedLead, setSelectedLead] = useState(salesConsoleLiveLeadRecords[0]);
  const [selectedInventory, setSelectedInventory] = useState(salesConsoleLiveInventoryMatches[0]);
  const [selectedManagerQueue, setSelectedManagerQueue] = useState<(typeof salesConsoleLiveManagerQueues)[number]>(salesConsoleLiveManagerQueues[0]);
  const activeWorkspace = workspaceSummaries[activeNav];
  const selectedLaneContract = getRevenueLaneContract(selectedLane.contractLane);
  const selectedLaneLinks = getSalesConsoleCrossConsoleLinksForLane(selectedLane.contractLane, activeRole);
  const sourceBackedTabStates = useMemo(() => buildSalesConsoleSourceBackedTabStates(), []);
  const activeSourceBackedState = sourceBackedTabStates.find((state) => state.tab === activeNav);

  const filteredWork = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return salesConsoleLiveWorkItems.filter((item) => {
      const matchesLane = laneFilter === "All Lanes" || item.lane === laneFilter;
      const matchesSearch =
        !normalized ||
        [item.customer, item.contact, item.vehicle, item.stock, item.lane, item.stage, item.source]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesLane && matchesSearch;
    });
  }, [laneFilter, query]);

  const searchExperience = useMemo(() => searchSalesConsoleLiveExperience(query, activeRole), [activeRole, query]);
  const searchResults = searchExperience.results;
  const groupedWork = useMemo(() => {
    const groups: WorkItem["group"][] = ["Must Do Now", "Today", "Waiting", "Watch"];

    return groups.map((group) => ({
      group,
      items: filteredWork.filter((item) => item.group === group)
    }));
  }, [filteredWork]);

  function openSearchResult(result: SalesFederatedSearchResult) {
    if (result.category === "appointment") setActiveNav("Appointments");
    else if (result.category === "task-promise") setActiveNav("Tasks & Promises");
    else if (result.category === "stock-vin") setActiveNav("Inventory Intelligence");
    else if (result.category === "manager-review") setActiveNav("Manager Command");
    else if (result.category === "evidence") setActiveNav("Admin / Source Health");
    else if (result.category === "customer" || result.category === "phone-email") setActiveNav("Customers");
    else setActiveNav("Revenue Desk");

    const matchedWork = salesConsoleLiveWorkItems.find((item) => result.tokens.some((token) => token.includes(item.customer) || token.includes(item.stock)));
    const matchedLane = salesConsoleLiveRevenueLanes.find((lane) => result.tokens.some((token) => token.includes(lane.name) || token.includes(lane.contractLane)));

    if (matchedWork) setSelectedCustomer(matchedWork);
    if (matchedLane) setSelectedLane(matchedLane);
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
          <button type="button" onClick={() => setActiveNav("Admin / Source Health")}>
            Source Health 98%
          </button>
        </header>
        <section className={styles.integrationStrip} aria-label="Dispatch Board source links">
          {salesConsoleCrossConsoleNavigationTargets
            .filter((target) => target.visibleToRoles.includes(activeRole))
            .slice(0, 5)
            .map((target) => (
              <a key={target.destination} href={target.href}>
                {target.label}
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

        <section className={styles.kpis} aria-label="Sales Console KPI strip">
          {[
            ["Opportunities", "128", "12% vs yesterday"],
            ["Gross Profit", "$184,650", "8% vs yesterday"],
            ["Units Sold (MTD)", "42", "5 vs last month"],
            ["Show Rate", "24.7%", "1.6pp vs yesterday"],
            ["Appt. Show Rate", "63.3%", "3.8pp vs yesterday"],
            ["First Response", "5m 22s", "1m 05s faster"]
          ].map(([label, value, trend]) => (
            <article key={label} className={styles.kpi}>
              <span>{label}</span>
              <strong>{value}</strong>
              <em>{trend}</em>
            </article>
          ))}
        </section>

        <div className={styles.workspace}>
          <section className={styles.operatingArea}>
            <section className={styles.workQueue}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>{activeWorkspace.title}</h1>
                  <p>{query ? `Filtered by "${query}"` : activeWorkspace.description}</p>
                </div>
                <div className={styles.filters}>
                  <select value={laneFilter} onChange={(event) => setLaneFilter(event.target.value)} aria-label="Lane filter">
                    <option>All Lanes</option>
                    {salesConsoleLiveRevenueLanes.map((lane) => (
                      <option key={lane.name}>{lane.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setQuery("")}>Reset</button>
                </div>
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
                    <a href="/appointments">Open related appointments</a>
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
                          <em>Algorithm score {item.algorithmScore}: {item.algorithmReasons.join(", ")}</em>
                          <em>
                            <a href={getSalesConsoleCustomer360Href(item.customer)}>Customer 360</a> ·{" "}
                            <a href={getSalesConsoleVehicle360Href(item.stock)}>Vehicle 360</a>
                          </em>
                        </span>
                        <span className={styles.laneChip}>{item.lane}</span>
                        <span>{item.stage}</span>
                        <span className={styles.freshness}>{item.freshness}</span>
                        <span>{item.blockers.length ? item.blockers.join(", ") : "Clear"}</span>
                        <span>{item.nextAction}</span>
                        <span>
                          <button type="button" className={actionTone[item.actionState]} onClick={() => setSelectedCustomer(item)}>{item.action}</button>
                        </span>
                      </article>
                    )) : (
                      <p className={styles.emptyGroup}>No {group.toLowerCase()} records match the current search or lane filter.</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

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
                        {selectedLaneLinks.map((link) => (
                          <a key={link.destination} href={link.href}>{link.label}</a>
                        ))}
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

            <section className={styles.customer360} aria-label="Customer 360">
              <div>
                <h2>Customer 360</h2>
                <strong>{selectedCustomer.customer}</strong>
                <p>{selectedCustomer.contact} · {salesConsoleLiveCustomer360.consentLabel} · Source: {salesConsoleLiveCustomer360.sourceLink}</p>
              </div>
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
              </div>
            </section>
          </section>

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
                <button
                  type="button"
                  onClick={() => {
                    setSelectedManagerQueue(signal);
                    setActiveNav("Manager Command");
                  }}
                >
                  Open manager queue
                </button>
                <a href="/sales?workspace=manager-command">Open manager source context</a>
              </article>
            ))}

            <section className={styles.forecast}>
              <h3>Selected Drilldown</h3>
              <strong>{selectedManagerQueue.count}</strong>
              <p>{selectedManagerQueue.drilldowns.join(" · ")}</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
