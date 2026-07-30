"use client";

import { useMemo, useState } from "react";

import { salesConsoleLeadRecords } from "./sales-console-lead-operations";
import { searchSalesConsoleRecords, type SalesConsoleSearchResult } from "./sales-console-operational-search";
import styles from "./sales-console-elite-operating-console.module.css";

type ActionState = "Live Action" | "Controlled Action" | "Source-System Action" | "Future / Governed";

type WorkItem = {
  rank: number;
  group: "Must Do Now" | "Today" | "Waiting" | "Watch";
  customer: string;
  contact: string;
  vehicle: string;
  stock: string;
  lane: string;
  stage: string;
  freshness: string;
  source: string;
  blockers: string[];
  nextAction: string;
  reason: string;
  action: string;
  actionState: ActionState;
};

type RevenueLane = {
  name: string;
  stage: string;
  owner: string;
  nextAction: string;
  status: ActionState;
};

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

const workItems: WorkItem[] = [
  {
    rank: 1,
    group: "Must Do Now",
    customer: "John Smith",
    contact: "(555) 123-4567",
    vehicle: "2022 Toyota RAV4 XLE",
    stock: "TMS22145",
    lane: "Cash Sale",
    stage: "Proposal",
    freshness: "15m",
    source: "Website",
    blockers: ["IDV", "Trade App"],
    nextAction: "Confirm trade value and present final numbers",
    reason: "High-intent cash sale, active proposal, vehicle ready, manager attention needed.",
    action: "Open Revenue Desk",
    actionState: "Live Action"
  },
  {
    rank: 2,
    group: "Must Do Now",
    customer: "Maria Garcia",
    contact: "(555) 987-6543",
    vehicle: "2019 Honda CR-V EX",
    stock: "TMS19087",
    lane: "Financing Products",
    stage: "Credit App",
    freshness: "45m",
    source: "Phone Up",
    blockers: ["Credit Bureau"],
    nextAction: "Complete credit app and add co-applicant",
    reason: "Financing product has aging credit app and source-system blocker.",
    action: "Continue App",
    actionState: "Controlled Action"
  },
  {
    rank: 3,
    group: "Today",
    customer: "Alex Johnson",
    contact: "(555) 246-8101",
    vehicle: "2021 Ford F-150 XLT",
    stock: "TMS21022",
    lane: "Lease-to-Own",
    stage: "Structure",
    freshness: "2h",
    source: "Walk-in",
    blockers: ["LTO Program"],
    nextAction: "Review LTO options and terms",
    reason: "Lease-to-own structure is ready for manager-controlled review.",
    action: "Present Options",
    actionState: "Controlled Action"
  },
  {
    rank: 4,
    group: "Waiting",
    customer: "Samantha Lee",
    contact: "(555) 369-8520",
    vehicle: "2020 Chevy Malibu LT",
    stock: "TMS20011",
    lane: "BHPH",
    stage: "Compliance",
    freshness: "3h",
    source: "Referral",
    blockers: ["Pay Stub"],
    nextAction: "Collect proof of income",
    reason: "BHPH compliance is blocked by customer document evidence.",
    action: "Request Docs",
    actionState: "Controlled Action"
  },
  {
    rank: 5,
    group: "Watch",
    customer: "David Brown",
    contact: "(555) 741-9630",
    vehicle: "2018 Nissan Altima S",
    stock: "TMS18055",
    lane: "Public Repair",
    stage: "Estimate",
    freshness: "4h",
    source: "Drive-In",
    blockers: [],
    nextAction: "Review estimate and approval",
    reason: "Public repair lane is clear but needs follow-up before estimate ages.",
    action: "Open Repair Lane",
    actionState: "Live Action"
  }
];

const revenueLanes: RevenueLane[] = [
  { name: "Cash Sale", stage: "Proposal", owner: "James K.", nextAction: "Confirm trade and final numbers", status: "Live Action" },
  { name: "BHPH", stage: "Compliance", owner: "Tasha M.", nextAction: "Collect pay stub and verify", status: "Controlled Action" },
  { name: "Lease-to-Own", stage: "Structure", owner: "Marcus D.", nextAction: "Review terms and payments", status: "Controlled Action" },
  { name: "Public Repair", stage: "Estimate", owner: "Luis R.", nextAction: "Review estimate with customer", status: "Live Action" },
  { name: "Daily Rental", stage: "Ready", owner: "Nina P.", nextAction: "Vehicle ready for checkout", status: "Source-System Action" },
  { name: "Warranty", stage: "Authorization", owner: "Chris S.", nextAction: "Submit additional docs", status: "Controlled Action" },
  { name: "Financing Products", stage: "Offer", owner: "Alyssa W.", nextAction: "Present GAP and VSC options", status: "Future / Governed" }
];

const inventoryMatches = [
  { vehicle: "2022 Toyota RAV4 XLE", stock: "TMS22145", readiness: "Ready", pressure: "Medium", age: "35 days", retail: "$26,450", gross: "$2,850" },
  { vehicle: "2021 Honda CR-V EX", stock: "TMS21087", readiness: "Ready", pressure: "High", age: "48 days", retail: "$22,900", gross: "$2,150" },
  { vehicle: "2020 Ford F-150 XLT", stock: "TMS20022", readiness: "Aging", pressure: "High", age: "62 days", retail: "$26,900", gross: "$2,600" }
];

const managerSignals = [
  { title: "Review Queue", count: "17", items: ["Deals Awaiting Review 8", "Price Exceptions 5", "Customer Trade Approvals 4"] },
  { title: "Stalled Revenue", count: "$68,430", items: ["Deals Stalled > 24h 10", "Deals Stalled > 72h 4"] },
  { title: "SLA Risk", count: "12", items: ["No Response > 30m 6", "Appts. At Risk 4", "Tasks Overdue 2"] },
  { title: "Approval Backlog", count: "9", items: ["Finance Approvals 5", "LTO Program Approvals 2", "Warranty Authorizations 2"] },
  { title: "Coaching Opportunities", count: "6", items: ["Low Show Rate 3", "Low Gross Per Unit 2", "Overdue Follow Ups 1"] }
];

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
  const [selectedCustomer, setSelectedCustomer] = useState(workItems[0]);
  const [selectedLane, setSelectedLane] = useState(revenueLanes[0]);
  const [selectedLead, setSelectedLead] = useState(salesConsoleLeadRecords[0]);
  const activeWorkspace = workspaceSummaries[activeNav];

  const filteredWork = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return workItems.filter((item) => {
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

  const searchResults = useMemo(() => searchSalesConsoleRecords(query), [query]);
  const groupedWork = useMemo(() => {
    const groups: WorkItem["group"][] = ["Must Do Now", "Today", "Waiting", "Watch"];

    return groups.map((group) => ({
      group,
      items: filteredWork.filter((item) => item.group === group)
    }));
  }, [filteredWork]);

  function openSearchResult(result: SalesConsoleSearchResult) {
    setActiveNav(result.workspace);
    const matchedWork = workItems.find((item) => item.customer === result.customerName || item.lane === result.lane);
    const matchedLane = revenueLanes.find((lane) => lane.name === result.lane || result.lane.includes(lane.name));

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
                    <strong>{result.label}</strong>
                    <em>{result.detail}</em>
                  </span>
                  <small>{result.workspace} · Source: {result.source}</small>
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
                    {revenueLanes.map((lane) => (
                      <option key={lane.name}>{lane.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setQuery("")}>Reset</button>
                </div>
              </div>
              {activeNav === "Leads" ? (
                <section className={styles.leadOperations} aria-label="Lead Operations workspace">
                  <div className={styles.leadGrid}>
                    {salesConsoleLeadRecords.map((lead) => (
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
                      </button>
                    ))}
                  </div>
                  <aside className={styles.leadDetail}>
                    <strong>{selectedLead.id}: {selectedLead.customer}</strong>
                    <span>Duplicate risk: {selectedLead.duplicateRisk}</span>
                    <span>Next action: {selectedLead.nextAction}</span>
                    <span>Assignment: controlled until backend command approval</span>
                  </aside>
                </section>
              ) : null}
              <div className={styles.workspaceContract} aria-label="Active workspace operating contract">
                <span><strong>{activeRole}</strong> role context</span>
                <span><strong>{activeWorkspace.primaryMetric}</strong></span>
                <span>{activeWorkspace.allowed}</span>
                <span>{activeWorkspace.governed}</span>
              </div>

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
                      <button
                        key={`${item.customer}-${item.stock}`}
                        type="button"
                        className={`${styles.tableRow} ${selectedCustomer.customer === item.customer ? styles.selectedRow : ""}`}
                        onClick={() => setSelectedCustomer(item)}
                      >
                        <span>{item.rank}</span>
                        <span>
                          <strong>{item.customer}</strong>
                          <em>{item.vehicle} · Stock #{item.stock}</em>
                          <em>{item.reason}</em>
                        </span>
                        <span className={styles.laneChip}>{item.lane}</span>
                        <span>{item.stage}</span>
                        <span className={styles.freshness}>{item.freshness}</span>
                        <span>{item.blockers.length ? item.blockers.join(", ") : "Clear"}</span>
                        <span>{item.nextAction}</span>
                        <span className={actionTone[item.actionState]}>{item.action}</span>
                      </button>
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
                {revenueLanes.map((lane) => (
                  <button
                    key={lane.name}
                    type="button"
                    className={`${styles.laneCard} ${selectedLane.name === lane.name ? styles.selectedLane : ""}`}
                    onClick={() => setSelectedLane(lane)}
                  >
                    <strong>{lane.name}</strong>
                    <span>Stage: {lane.stage}</span>
                    <span>Owner: {lane.owner}</span>
                    <span>Next: {lane.nextAction}</span>
                    <em className={actionTone[lane.status]}>{lane.status}</em>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.inventory} aria-label="Inventory Intelligence">
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Inventory Intelligence</h2>
                  <p>Vehicle fit, readiness, market pressure, age, availability, and alternatives.</p>
                </div>
              </div>
              <div className={styles.inventoryGrid}>
                {inventoryMatches.map((vehicle) => (
                  <article key={vehicle.stock} className={styles.vehicleCard}>
                    <div className={styles.vehicleImage}>Vehicle</div>
                    <strong>{vehicle.vehicle}</strong>
                    <span>Stock #{vehicle.stock}</span>
                    <p>Readiness: {vehicle.readiness} · Market: {vehicle.pressure}</p>
                    <p>Age: {vehicle.age} · Retail {vehicle.retail} · Gross {vehicle.gross}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.customer360} aria-label="Customer 360">
              <div>
                <h2>Customer 360</h2>
                <strong>{selectedCustomer.customer}</strong>
                <p>{selectedCustomer.contact} · Active · Consent: Text opt-in, Email opt-in, Calls opt-in</p>
              </div>
              <div className={styles.customerCards}>
                <article>
                  <strong>Active Opportunity</strong>
                  <span>{selectedCustomer.vehicle}</span>
                  <em>{selectedCustomer.lane} · {selectedCustomer.stage}</em>
                </article>
                <article>
                  <strong>Selected Revenue Lane</strong>
                  <span>{selectedLane.name}</span>
                  <em>{selectedLane.status}</em>
                </article>
                <article>
                  <strong>Next Promise</strong>
                  <span>{selectedCustomer.nextAction}</span>
                  <em>On Track</em>
                </article>
                <article>
                  <strong>Documents</strong>
                  <span>Buyer order, trade appraisal, credit app</span>
                  <em>Source labeled</em>
                </article>
              </div>
            </section>
          </section>

          <aside className={styles.managerRail} aria-label="Manager Command Center">
            <h2>Manager Command Center</h2>
            {managerSignals.map((signal) => (
              <article key={signal.title} className={styles.signal}>
                <header>
                  <strong>{signal.title}</strong>
                  <span>{signal.count}</span>
                </header>
                {signal.items.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </article>
            ))}

            <section className={styles.forecast}>
              <h3>Forecast Confidence</h3>
              <strong>72%</strong>
              <p>Best Case $512K · Commit $436K · Gap $76K</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
