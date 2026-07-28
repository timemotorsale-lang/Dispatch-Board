import {
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Gauge,
  HandCoins,
  HelpCircle,
  LineChart,
  MessageSquareText,
  MoreVertical,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Star,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import type { CSSProperties } from "react";

import styles from "./sales-console-prototype.module.css";

const headlineMetrics = [
  { label: "Must Do Now", value: "18", delta: "+6 vs yesterday", tone: "danger" },
  { label: "Approval Pending", value: "7", delta: "+2 vs yesterday", tone: "warning" },
  { label: "SLA Risk", value: "5", delta: "-1 vs yesterday", tone: "danger" },
  { label: "Vehicle Match", value: "12", delta: "+3 vs yesterday", tone: "good" },
  { label: "Appointments", value: "9", delta: "Today", tone: "neutral" },
  { label: "New Leads", value: "14", delta: "Today", tone: "neutral" }
] as const;

const workQueue = [
  {
    customer: "Michael Johnson",
    phone: "(555) 123-4567",
    vehicle: "2024 Toyota RAV4 XLE",
    stock: "T241245",
    stage: "Credit App",
    nextAction: "Submit to lender",
    due: "Due: Now",
    freshness: "10m",
    blocker: "Approval Pending",
    reason: "Lender decision",
    tone: "danger"
  },
  {
    customer: "Sarah Williams",
    phone: "(555) 234-5678",
    vehicle: "2024 Honda CR-V EX-L",
    stock: "H241189",
    stage: "Manager Review",
    nextAction: "Manager approval",
    due: "Due: 15m",
    freshness: "28m",
    blocker: "Approval Pending",
    reason: "Rate / terms",
    tone: "warning"
  },
  {
    customer: "David Martinez",
    phone: "(555) 345-6789",
    vehicle: "2024 Ford F-150 XLT",
    stock: "F241512",
    stage: "Structure Deal",
    nextAction: "Build terms",
    due: "Due: 30m",
    freshness: "45m",
    blocker: "SLA Risk",
    reason: "No activity",
    tone: "danger"
  },
  {
    customer: "Emily Brown",
    phone: "(555) 456-7890",
    vehicle: "2024 Chevy Equinox LT",
    stock: "C241276",
    stage: "Vehicle Selection",
    nextAction: "Vehicle presentation",
    due: "Due: 1h",
    freshness: "1h 12m",
    blocker: "-",
    reason: "-",
    tone: "neutral"
  },
  {
    customer: "James Anderson",
    phone: "(555) 567-8901",
    vehicle: "2023 Toyota Camry SE",
    stock: "T231102",
    stage: "Credit App",
    nextAction: "Additional info",
    due: "Due: 2h",
    freshness: "1h 55m",
    blocker: "SLA Risk",
    reason: "Docs pending",
    tone: "warning"
  },
  {
    customer: "Ashley Thompson",
    phone: "(555) 678-9012",
    vehicle: "2024 Nissan Rogue SV",
    stock: "N241331",
    stage: "Trade Appraisal",
    nextAction: "Appraise trade",
    due: "Due: 3h",
    freshness: "2h 10m",
    blocker: "-",
    reason: "-",
    tone: "neutral"
  },
  {
    customer: "Christopher Lee",
    phone: "(555) 789-0123",
    vehicle: "2024 Jeep Grand Cherokee L",
    stock: "J241221",
    stage: "Proposal",
    nextAction: "Send proposal",
    due: "Due: 4h",
    freshness: "3h 20m",
    blocker: "-",
    reason: "-",
    tone: "neutral"
  },
  {
    customer: "Amanda Wilson",
    phone: "(555) 890-1234",
    vehicle: "2024 Mazda CX-5 Carbon",
    stock: "M241198",
    stage: "Follow Up",
    nextAction: "Check in",
    due: "Due: 1d",
    freshness: "1d 2h",
    blocker: "-",
    reason: "-",
    tone: "neutral"
  }
] as const;

const dealRows = [
  { id: "D-12457", customer: "Michael Johnson", vehicle: "2024 Toyota RAV4 XLE", scenario: "Scenario 2 / v1", payment: "$427 / mo", approval: "Lender Approved", tone: "good" },
  { id: "D-12431", customer: "Sarah Williams", vehicle: "2024 Honda CR-V EX-L", scenario: "Scenario 1 / v2", payment: "$512 / mo", approval: "Pending Manager", tone: "warning" },
  { id: "D-12402", customer: "David Martinez", vehicle: "2024 Ford F-150 XLT", scenario: "Scenario 1 / v1", payment: "$648 / mo", approval: "Pending Lender", tone: "danger" },
  { id: "D-12388", customer: "Emily Brown", vehicle: "2024 Chevy Equinox LT", scenario: "Scenario 2 / v1", payment: "$389 / mo", approval: "Pre-Approved", tone: "good" },
  { id: "D-12377", customer: "James Anderson", vehicle: "2023 Toyota Camry SE", scenario: "Scenario 1 / v1", payment: "$376 / mo", approval: "Docs Needed", tone: "warning" }
] as const;

const vehicleMatches = [
  { name: "2024 Toyota RAV4 XLE", stock: "T241245", match: "Michael Johnson", score: "94", status: "Ready", detail: "No blockers", price: "$28,645", tone: "good" },
  { name: "2024 Honda CR-V EX-L", stock: "H241189", match: "Sarah Williams", score: "91", status: "Ready", detail: "No blockers", price: "$29,890", tone: "good" },
  { name: "2024 Ford F-150 XLT", stock: "F241512", match: "David Martinez", score: "87", status: "Not Ready", detail: "2 blockers", price: "$44,320", tone: "warning" },
  { name: "2024 Nissan Rogue SV", stock: "N241331", match: "Ashley Thompson", score: "82", status: "Not Ready", detail: "1 blocker", price: "$27,115", tone: "danger" }
] as const;

const riskQueues = [
  { label: "Deals at Risk (No Activity > 2h)", value: "12" },
  { label: "Deals Over SLA", value: "5" },
  { label: "Credit Apps Awaiting Decision", value: "7" },
  { label: "Stale Trade Appraisals (> 24h)", value: "4" }
] as const;

const approvalQueues = [
  { label: "Deals Awaiting Manager Approval", value: "7" },
  { label: "Credit Overrides", value: "3" },
  { label: "Rate / Terms Exceptions", value: "2" }
] as const;

const forecastRows = [
  { label: "Units", value: "148", target: "160", attainment: "93%" },
  { label: "Gross Profit", value: "$165,420", target: "$180,000", attainment: "92%" },
  { label: "Finance Reserve", value: "$32,810", target: "$35,000", attainment: "94%" }
] as const;

const topOpportunities = [
  { customer: "Kevin White", vehicle: "2024 Ford Explorer Limited", value: "$44,250", confidence: "High" },
  { customer: "Nicole Harris", vehicle: "2024 Toyota Highlander XLE", value: "$42,180", confidence: "High" },
  { customer: "Robert Garcia", vehicle: "2024 Chevy Silverado 1500", value: "$38,960", confidence: "Med" }
] as const;

function toneClass(tone: "danger" | "good" | "neutral" | "warning") {
  if (tone === "danger") return styles.toneDanger;
  if (tone === "good") return styles.toneGood;
  if (tone === "warning") return styles.toneWarning;
  return styles.toneNeutral;
}

function statusClass(tone: "danger" | "good" | "neutral" | "warning") {
  if (tone === "danger") return styles.statusDanger;
  if (tone === "good") return styles.statusGood;
  if (tone === "warning") return styles.statusWarning;
  return styles.statusNeutral;
}

function barStyle(width: string) {
  return { "--bar-size": width } as CSSProperties;
}

export function SalesConsolePrototype() {
  return (
    <section className={styles.console} aria-label="Enterprise Sales Console prototype">
      <header className={styles.topbar}>
        <div className={styles.titleBlock}>
          <span>Time Motor Sales</span>
          <h1>Sales Console</h1>
        </div>
        <label className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <input aria-label="Search sales console" placeholder="Search leads, customers, deals, inventory..." type="search" />
          <kbd>Ctrl K</kbd>
        </label>
        <div className={styles.topbarActions}>
          <button type="button"><Bell size={16} /> Alerts <b>12</b></button>
          <button type="button"><MessageSquareText size={16} /> Messages <b>5</b></button>
          <button type="button"><CalendarDays size={16} /> Calendar</button>
          <button type="button"><HelpCircle size={16} /> Help</button>
          <button type="button">All Stores <ChevronDown size={14} /></button>
        </div>
      </header>

      <div className={styles.bodyGrid}>
        <main className={styles.mainColumn}>
          <section className={styles.panel} id="today" aria-labelledby="sales-today-title">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Live seller queue</span>
                <h2 id="sales-today-title">Salesperson Today</h2>
              </div>
              <div className={styles.headerActions}>
                <button type="button">My Pipeline <ChevronDown size={13} /></button>
                <button aria-label="Refresh sales queue" type="button"><RefreshCw size={15} /></button>
                <button type="button"><Settings size={15} /> Customize</button>
                <button aria-label="More sales actions" type="button"><MoreVertical size={15} /></button>
              </div>
            </div>

            <div className={styles.metricStrip}>
              {headlineMetrics.map((metric) => (
                <article className={styles.metric} key={metric.label}>
                  <span>{metric.label}</span>
                  <strong className={toneClass(metric.tone)}>{metric.value}</strong>
                  <small>{metric.delta}</small>
                </article>
              ))}
            </div>

            <div className={styles.tableShell}>
              <table className={styles.workTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Primary Vehicle</th>
                    <th>Stage</th>
                    <th>Next Action</th>
                    <th>Freshness</th>
                    <th>Blocker</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {workQueue.map((item, index) => (
                    <tr key={`${item.customer}-${item.stock}`}>
                      <td>{index + 1}</td>
                      <td>
                        <div className={styles.customerCell}><Star size={13} /><span><strong>{item.customer}</strong><small>{item.phone}</small></span></div>
                      </td>
                      <td><strong>{item.vehicle}</strong><small>Stock # {item.stock}</small></td>
                      <td><span className={styles.stagePill}>{item.stage}</span></td>
                      <td><strong>{item.nextAction}</strong><small className={styles.dueText}>{item.due}</small></td>
                      <td><span className={toneClass(item.tone)}>{item.freshness}</span></td>
                      <td><span className={item.blocker === "-" ? styles.mutedText : statusClass(item.tone)}>{item.blocker}</span></td>
                      <td>{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className={styles.panelFooter}>
              <span>Showing 1 - 8 of 18</span>
              <a href="#today">View All Work Queue <ChevronRight size={14} /></a>
            </footer>
          </section>

          <div className={styles.lowerGrid}>
            <section className={styles.panel} id="deal-desk">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Deal Desk</span>
                  <h2>My deals</h2>
                </div>
                <span className={styles.statusDanger}>7 approvals</span>
              </div>
              <table className={styles.compactTable}>
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Scenario</th>
                    <th>Est. Pay</th>
                    <th>Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {dealRows.map((deal) => (
                    <tr key={deal.id}>
                      <td><a href="#deal-desk">{deal.id}</a></td>
                      <td>{deal.customer}</td>
                      <td>{deal.vehicle}</td>
                      <td>{deal.scenario}</td>
                      <td>{deal.payment}</td>
                      <td><span className={statusClass(deal.tone)}>{deal.approval}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <footer className={styles.panelFooter}><span>Quote scenarios are versioned.</span><a href="#deal-desk">View All Deals <ChevronRight size={14} /></a></footer>
            </section>

            <section className={styles.panel} id="inventory-intelligence">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Inventory Intelligence</span>
                  <h2>Vehicle Match</h2>
                </div>
                <span className={styles.statusDanger}>6 alerts</span>
              </div>
              <div className={styles.vehicleList}>
                {vehicleMatches.map((vehicle) => (
                  <article className={styles.vehicleRow} key={vehicle.stock}>
                    <div className={styles.vehicleThumb}><CarFront size={24} /></div>
                    <div className={styles.vehicleCopy}>
                      <strong>{vehicle.name}</strong>
                      <span>Stock # {vehicle.stock} · Matched to {vehicle.match}</span>
                    </div>
                    <div className={styles.scoreRing}>{vehicle.score}<small>Fit</small></div>
                    <div><span className={statusClass(vehicle.tone)}>{vehicle.status}</span><small>{vehicle.detail}</small></div>
                    <strong>{vehicle.price}</strong>
                  </article>
                ))}
              </div>
              <footer className={styles.panelFooter}><span>Blocked units are visible before presentation.</span><a href="#inventory-intelligence">View All Vehicle Matches <ChevronRight size={14} /></a></footer>
            </section>
          </div>
        </main>

        <aside className={styles.commandRail} id="command-center" aria-label="Manager Command Center">
          <section className={styles.panel}>
            <div className={styles.railHeader}>
              <div>
                <span className={styles.eyebrow}>Manager Command Center</span>
                <h2>Today at a glance</h2>
              </div>
              <MoreVertical size={17} aria-hidden="true" />
            </div>
            <div className={styles.glanceGrid}>
              <div><span>Total Deals</span><strong>42</strong><small>+8 vs yesterday</small></div>
              <div><span>Sold Units</span><strong>15</strong><small>+3 vs yesterday</small></div>
              <div><span>Gross Profit</span><strong>$18,642</strong><small>+9% vs yesterday</small></div>
              <div><span>Show Rate</span><strong>28%</strong><small>-2pp vs yesterday</small></div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Risk Queues</h2><a href="#command-center">View All</a></div>
            <div className={styles.railList}>
              {riskQueues.map((queue) => <div key={queue.label}><span>{queue.label}</span><strong>{queue.value}</strong></div>)}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Approvals</h2><a href="#deal-desk">View All</a></div>
            <div className={styles.railList}>
              {approvalQueues.map((queue) => <div key={queue.label}><span>{queue.label}</span><strong>{queue.value}</strong></div>)}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Forecast</h2><a href="#pipeline">View Forecast</a></div>
            <div className={styles.forecastList}>
              {forecastRows.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                  <small>{row.target}</small>
                  <i style={barStyle(row.attainment)} />
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel} id="leads">
            <div className={styles.railHeader}><h2>Lead Operations</h2><UsersRound size={18} /></div>
            <div className={styles.leadHealth}>
              <span><CheckCircle2 size={14} /> 14 contacted</span>
              <span><Clock3 size={14} /> 5 SLA risks</span>
              <span><AlertTriangle size={14} /> 2 dedupe reviews</span>
              <span><CalendarDays size={14} /> 9 appointments</span>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Top Opportunities</h2><a href="#today">View All</a></div>
            <div className={styles.opportunityList}>
              {topOpportunities.map((opportunity) => (
                <article key={opportunity.customer}>
                  <div><strong>{opportunity.customer}</strong><span>{opportunity.vehicle}</span></div>
                  <b>{opportunity.value}</b>
                  <small>{opportunity.confidence}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Prototype only</h2><ClipboardCheck size={18} /></div>
            <p className={styles.guardrailCopy}>
              This first slice renders static sales-console read models only. It does not send customer messages,
              reserve vehicles, approve discounts, change finance state, or write production records.
            </p>
          </section>

          <section className={styles.hiddenSmokeText} aria-hidden="true">
            <BadgeDollarSign /> <HandCoins /> <LineChart /> <UserRoundCheck /> <Gauge /> <FileCheck2 /> <ShieldCheck />
          </section>
        </aside>
      </div>
    </section>
  );
}
