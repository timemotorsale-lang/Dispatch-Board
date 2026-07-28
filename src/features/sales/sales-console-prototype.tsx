import {
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  CalendarClock,
  CarFront,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Gauge,
  HandCoins,
  LineChart,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import type { CSSProperties } from "react";

import styles from "./sales-console-prototype.module.css";

const todayMetrics = [
  { label: "Must do now", value: "7", detail: "3 SLA at risk", tone: "danger" },
  { label: "Appointments", value: "12", detail: "5 confirmed", tone: "good" },
  { label: "Active deals", value: "18", detail: "6 closeable", tone: "neutral" },
  { label: "Manager alerts", value: "9", detail: "4 approvals", tone: "warning" }
] as const;

const workQueue = [
  {
    customer: "Marcus Green",
    vehicle: "2021 Toyota Camry SE",
    stage: "Appointment Set",
    nextAction: "Confirm 4:30 PM visit",
    freshness: "At Risk",
    reason: "High intent, same-day appointment, no confirmation yet",
    blocker: "Needs trade payoff",
    tone: "warning"
  },
  {
    customer: "Dana Phillips",
    vehicle: "2020 Honda CR-V EX",
    stage: "Working Deal",
    nextAction: "Send revised scenario",
    freshness: "Due Today",
    reason: "Accepted vehicle match, waiting on manager-approved terms",
    blocker: "Approval pending",
    tone: "danger"
  },
  {
    customer: "Jorge Rivera",
    vehicle: "2019 Ford F-150 XLT",
    stage: "Qualified",
    nextAction: "Offer two alternatives",
    freshness: "Fresh",
    reason: "Original unit blocked, close alternatives available",
    blocker: "Primary unit in recon",
    tone: "neutral"
  },
  {
    customer: "Elaine Foster",
    vehicle: "2022 Kia Telluride SX",
    stage: "Finance",
    nextAction: "Collect proof of residence",
    freshness: "Due Today",
    reason: "Finance handoff returned with one document blocker",
    blocker: "Missing document",
    tone: "warning"
  }
] as const;

const dealStages = [
  { label: "Needs", status: "Complete" },
  { label: "Vehicle", status: "Complete" },
  { label: "Quote", status: "Version 3" },
  { label: "Approval", status: "Pending" },
  { label: "Finance", status: "Blocked" },
  { label: "Delivery", status: "Not ready" }
] as const;

const vehicleMatches = [
  {
    name: "2020 Honda CR-V EX",
    stock: "TMS-2841",
    score: "94",
    status: "Sellable now",
    reasons: ["Budget fit", "Feature match", "Ready today"],
    detail: "Strong fit for Dana Phillips with low readiness risk."
  },
  {
    name: "2021 Mazda CX-5 Touring",
    stock: "TMS-2918",
    score: "88",
    status: "Alternative",
    reasons: ["Lower payment", "Aged 61 days", "Clean title"],
    detail: "Good substitute if payment target becomes primary."
  },
  {
    name: "2022 Nissan Rogue SV",
    stock: "TMS-3004",
    score: "72",
    status: "Blocked",
    reasons: ["Service hold", "Feature fit", "Market demand"],
    detail: "Do not present as clean recommendation until service clears."
  }
] as const;

const commandQueues = [
  { label: "SLA risk", value: "5", action: "Assign or escalate", icon: Clock3 },
  { label: "Stalled revenue", value: "8", action: "Request update", icon: Gauge },
  { label: "Approvals", value: "4", action: "Approve or reject", icon: ShieldCheck },
  { label: "Delivery blockers", value: "3", action: "Name blocker owner", icon: FileCheck2 }
] as const;

const navigation = [
  "Today",
  "Leads",
  "Pipeline",
  "Deal Desk",
  "Inventory Intelligence",
  "Command Center"
] as const;

function metricClass(tone: "danger" | "good" | "neutral" | "warning") {
  if (tone === "danger") return styles.metricDanger;
  if (tone === "good") return styles.metricGood;
  if (tone === "warning") return styles.metricWarning;
  return styles.metricNeutral;
}

function freshnessClass(tone: "danger" | "neutral" | "warning") {
  if (tone === "danger") return styles.badgeDanger;
  if (tone === "warning") return styles.badgeWarning;
  return styles.badgeNeutral;
}

export function SalesConsolePrototype() {
  return (
    <section className={styles.console} aria-label="Enterprise Sales Console prototype">
      <header className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <input aria-label="Search sales console" placeholder="Search customer, stock, VIN, deal, phone..." type="search" />
        </label>
        <div className={styles.toolbarActions}>
          <button type="button"><Bell size={16} /> 9 alerts</button>
          <button type="button"><Sparkles size={16} /> New lead</button>
        </div>
      </header>

      <nav className={styles.moduleTabs} aria-label="Sales console modules">
        {navigation.map((item, index) => (
          <a className={index === 0 ? styles.tabActive : styles.tab} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>
            {item}
          </a>
        ))}
      </nav>

      <div className={styles.grid}>
        <main className={styles.mainStack}>
          <section className={styles.workSurface} id="today" aria-labelledby="sales-today-title">
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.eyebrow}>Salesperson Today</span>
                <h1 id="sales-today-title">Ranked work that tells the team what to do next.</h1>
                <p>Prototype shell for owner, stage, next action, freshness, blocker, and explainable priority.</p>
              </div>
              <span className={styles.modePill}><UserRoundCheck size={15} /> Seller view</span>
            </div>

            <div className={styles.metricGrid}>
              {todayMetrics.map((metric) => (
                <article className={`${styles.metric} ${metricClass(metric.tone)}`} key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.detail}</small>
                </article>
              ))}
            </div>

            <div className={styles.queuePanel}>
              <div className={styles.queueHeader}>
                <strong>Must Do Now</strong>
                <span>Sorted by intent, SLA risk, stage importance, vehicle scarcity, and manager priority</span>
              </div>
              <div className={styles.workRows}>
                {workQueue.map((item) => (
                  <article className={styles.workRow} key={`${item.customer}-${item.vehicle}`}>
                    <div className={styles.customerBlock}>
                      <strong>{item.customer}</strong>
                      <span>{item.vehicle}</span>
                    </div>
                    <div>
                      <small>Stage</small>
                      <span>{item.stage}</span>
                    </div>
                    <div>
                      <small>Next action</small>
                      <span>{item.nextAction}</span>
                    </div>
                    <span className={freshnessClass(item.tone)}>{item.freshness}</span>
                    <div className={styles.reasonBlock}>
                      <small>Why now</small>
                      <span>{item.reason}</span>
                      <em>{item.blocker}</em>
                    </div>
                    <button aria-label={`Open ${item.customer}`} type="button"><ChevronRight size={17} /></button>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.twoColumn}>
            <article className={styles.panel} id="deal-desk">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Deal Desk</span>
                  <h2>Dana Phillips deal workspace</h2>
                </div>
                <span className={styles.badgeDanger}>Approval pending</span>
              </div>
              <div className={styles.dealGrid}>
                {dealStages.map((stage) => (
                  <div className={styles.stageTile} key={stage.label}>
                    <span>{stage.label}</span>
                    <strong>{stage.status}</strong>
                  </div>
                ))}
              </div>
              <div className={styles.quoteBox}>
                <div>
                  <small>Current scenario</small>
                  <strong>Version 3</strong>
                  <span>$421 estimated payment, trade pending, discount exception flagged.</span>
                </div>
                <button type="button"><HandCoins size={16} /> Request approval</button>
              </div>
            </article>

            <article className={styles.panel} id="pipeline">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Pipeline</span>
                  <h2>Closeable this week</h2>
                </div>
                <LineChart size={20} aria-hidden="true" />
              </div>
              <div className={styles.pipelineBars} aria-label="Pipeline stage distribution">
                <span style={{ "--bar-size": "78%" } as CSSProperties}>Qualified</span>
                <span style={{ "--bar-size": "62%" } as CSSProperties}>Working Deal</span>
                <span style={{ "--bar-size": "46%" } as CSSProperties}>Finance</span>
                <span style={{ "--bar-size": "31%" } as CSSProperties}>Delivery</span>
              </div>
            </article>
          </section>

          <section className={styles.panel} id="inventory-intelligence">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Inventory Intelligence</span>
                <h2>Vehicle match and readiness</h2>
              </div>
              <span className={styles.modePill}><CarFront size={15} /> 3 candidates</span>
            </div>
            <div className={styles.vehicleGrid}>
              {vehicleMatches.map((vehicle) => (
                <article className={styles.vehicleCard} key={vehicle.stock}>
                  <div className={styles.vehicleHeader}>
                    <div>
                      <strong>{vehicle.name}</strong>
                      <span>{vehicle.stock}</span>
                    </div>
                    <b>{vehicle.score}</b>
                  </div>
                  <span className={vehicle.status === "Blocked" ? styles.badgeDanger : styles.badgeNeutral}>{vehicle.status}</span>
                  <p>{vehicle.detail}</p>
                  <div className={styles.reasonChips}>
                    {vehicle.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className={styles.commandRail} id="command-center" aria-label="Manager Command Center">
          <section className={styles.commandCard}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Manager Command Center</span>
                <h2>Protect revenue before it drifts.</h2>
              </div>
              <BadgeDollarSign size={21} aria-hidden="true" />
            </div>
            <div className={styles.commandList}>
              {commandQueues.map(({ icon: Icon, ...queue }) => (
                <article key={queue.label}>
                  <Icon size={18} aria-hidden="true" />
                  <div>
                    <strong>{queue.label}</strong>
                    <span>{queue.action}</span>
                  </div>
                  <b>{queue.value}</b>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.commandCard} id="leads">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Lead Operations</span>
                <h2>Lead intake health</h2>
              </div>
              <UsersRound size={21} aria-hidden="true" />
            </div>
            <div className={styles.leadHealth}>
              <span><CheckCircle2 size={15} /> 14 contacted</span>
              <span><CalendarClock size={15} /> 8 appointments set</span>
              <span><AlertTriangle size={15} /> 2 dedupe reviews</span>
              <span><MessageSquareText size={15} /> 5 confirmations needed</span>
            </div>
          </section>

          <section className={styles.commandCard}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Pilot guardrails</span>
                <h2>Prototype only</h2>
              </div>
              <ClipboardCheck size={21} aria-hidden="true" />
            </div>
            <p className={styles.guardrailCopy}>
              This first slice renders static sales-console read models only. It does not send customer messages,
              reserve vehicles, approve discounts, change finance state, or write production records.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
