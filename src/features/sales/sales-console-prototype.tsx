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

import { salesConsoleMvpDefinition } from "./sales-console-mvp-definition";
import { salesConsoleMvpExecution } from "./sales-console-mvp-execution";
import { salesConsoleMvpLiveDataContract } from "./sales-console-mvp-live-data-contract";
import { salesConsoleReadAdapterPreview } from "./sales-console-mvp-read-adapters";
import { salesConsoleMvpRealDataWiring } from "./sales-console-mvp-real-data-wiring";
import styles from "./sales-console-prototype.module.css";

const salesConsoleReadModel = salesConsoleReadAdapterPreview;

const headlineMetrics = [
  { label: "Must Do Now", value: String(salesConsoleReadModel.sellerQueue.filter((item) => item.tone === "danger").length), delta: "Adapter ranked", tone: "danger" },
  { label: "Approval Pending", value: String(salesConsoleReadModel.deals.filter((deal) => deal.approval.includes("Pending")).length), delta: "Read-only", tone: "warning" },
  { label: "SLA Risk", value: String(salesConsoleReadModel.leadOperations.filter((lead) => lead.tone === "danger").length), delta: "Lead adapter", tone: "danger" },
  { label: "Vehicle Match", value: String(salesConsoleReadModel.inventoryMatches.length), delta: "Verify labels", tone: "good" },
  { label: "Placeholders", value: String(salesConsoleReadModel.deals.filter((deal) => deal.freshnessState === "placeholder").length), delta: "Clearly labeled", tone: "neutral" },
  { label: "Read Model", value: salesConsoleReadModel.readOnly ? "RO" : "RW", delta: "Read-only", tone: "neutral" }
] as const;

const workQueue = salesConsoleReadModel.sellerQueue;

const dealRows = salesConsoleReadModel.deals;

const vehicleMatches = salesConsoleReadModel.inventoryMatches;

const riskQueues = salesConsoleReadModel.managerRisks.map((risk) => ({
  label: risk.label,
  tone: risk.tone,
  value: String(risk.count)
}));

const approvalQueues = [
  { label: "Deals Awaiting Manager Approval", value: String(dealRows.filter((deal) => deal.approval.includes("Pending")).length) },
  { label: "Visibility-Only Deals", value: String(dealRows.filter((deal) => deal.freshnessState === "placeholder").length) },
  { label: "Read-Only Guardrails", value: String(salesConsoleMvpExecution.readOnlyGuardrails.length) }
] as const;

const glanceMetrics = [
  { label: "Adapter Deals", value: String(dealRows.length), delta: "Read-only" },
  { label: "Seller Items", value: String(workQueue.length), delta: "Adapter ranked" },
  { label: "Lead Risks", value: String(salesConsoleReadModel.leadOperations.filter((lead) => lead.tone === "danger").length), delta: "Needs attention" },
  { label: "Verify Vehicles", value: String(vehicleMatches.filter((vehicle) => vehicle.freshnessState === "verify-first").length), delta: "Verify-first" }
] as const;

const forecastRows = [
  { label: "Units", value: "148", target: "160", attainment: "93%" },
  { label: "Gross Profit", value: "$165,420", target: "$180,000", attainment: "92%" },
  { label: "Finance Reserve", value: "$32,810", target: "$35,000", attainment: "94%" }
] as const;

const topOpportunities = dealRows.map((deal) => ({
  confidence: deal.freshnessState,
  customer: deal.customer,
  value: deal.payment,
  vehicle: deal.vehicle
}));

const adapterSourceLinks = workQueue.flatMap((item) =>
  item.sourceLinks.map((link) => ({
    ...link,
    owner: item.customer
  }))
);

const leadHealthSignals = [
  { icon: CheckCircle2, label: `${salesConsoleReadModel.leadOperations.filter((lead) => lead.tone === "good").length} healthy` },
  { icon: Clock3, label: `${salesConsoleReadModel.leadOperations.filter((lead) => lead.freshnessState === "stale").length} stale` },
  { icon: AlertTriangle, label: `${salesConsoleReadModel.leadOperations.filter((lead) => lead.label === "Duplicate review").length} dedupe reviews` },
  { icon: CalendarDays, label: `${salesConsoleReadModel.leadOperations.reduce((total, lead) => total + lead.appointmentCount, 0)} appointments` }
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

function executionStatusClass(status: "disabled" | "planned" | "ready" | "review") {
  if (status === "ready") return styles.statusGood;
  if (status === "review") return styles.statusWarning;
  if (status === "disabled") return styles.statusDanger;
  return styles.statusNeutral;
}

function freshnessClass(freshness: "current" | "placeholder" | "stale" | "verify-first") {
  if (freshness === "current") return styles.statusGood;
  if (freshness === "stale") return styles.statusDanger;
  if (freshness === "verify-first") return styles.statusWarning;
  return styles.statusNeutral;
}

function liveSourceStatusClass(status: "contract-ready" | "needs-mapping" | "placeholder-only") {
  if (status === "contract-ready") return styles.statusGood;
  if (status === "needs-mapping") return styles.statusWarning;
  return styles.statusNeutral;
}

function realDataStatusClass(status: "fallback" | "hybrid-fallback" | "wired") {
  if (status === "wired") return styles.statusGood;
  if (status === "hybrid-fallback") return styles.statusWarning;
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

      <section className={styles.executionFoundation} aria-label="Sales Console MVP execution foundation">
        <div>
          <span className={styles.eyebrow}>Execution foundation</span>
          <h2>Read-only MVP pilot shell</h2>
          <p>{salesConsoleMvpDefinition.recommendedMvpBoundary.releaseLine}</p>
        </div>
        <div className={styles.shellCheckGrid}>
          {salesConsoleMvpExecution.shellChecks.map((check) => (
            <article key={check.check}>
              <strong>{check.check}</strong>
              <span className={executionStatusClass(check.status)}>{check.status}</span>
              <small>{check.proof}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.roleRail} aria-label="Sales Console MVP role placeholders">
        {salesConsoleMvpExecution.roleViews.map((role) => (
          <article className={role.role === salesConsoleMvpExecution.defaultRole ? styles.activeRoleCard : undefined} key={role.role}>
            <strong>{role.label}</strong>
            <span>{role.primarySurface}</span>
            <small>{role.visibility}</small>
          </article>
        ))}
      </section>

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
                  {workQueue.map((item) => (
                    <tr key={`${item.customer}-${item.stock}`}>
                      <td>{item.priorityRank}</td>
                      <td>
                        <div className={styles.customerCell}><Star size={13} /><span><strong>{item.customer}</strong><small>{item.phone} · {item.sourceLinks[0]?.label}</small></span></div>
                      </td>
                      <td><strong>{item.vehicle}</strong><small>Stock # {item.stock}</small></td>
                      <td><span className={styles.stagePill}>{item.stage}</span></td>
                      <td><strong>{item.nextAction}</strong><small className={styles.dueText}>{item.due}</small></td>
                      <td><span className={freshnessClass(item.freshnessState)}>{item.freshness}</span></td>
                      <td><span className={item.blocker === "-" ? styles.mutedText : statusClass(item.tone)}>{item.blocker}</span></td>
                      <td>{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className={styles.panelFooter}>
              <span>Showing {workQueue.length} adapter-ranked work items</span>
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
                    <tr key={deal.dealId}>
                      <td><a href="#deal-desk">{deal.dealId}</a></td>
                      <td>{deal.customer}</td>
                      <td>{deal.vehicle}</td>
                      <td>{deal.scenario}</td>
                      <td>{deal.payment}</td>
                      <td><span className={statusClass(deal.tone)}>{deal.approval}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <footer className={styles.panelFooter}><span>Quote scenarios are visibility-only from the adapter.</span><a href="#deal-desk">View All Deals <ChevronRight size={14} /></a></footer>
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
                      <strong>{vehicle.vehicle}</strong>
                      <span>Stock # {vehicle.stock} · Matched to {vehicle.matchCustomer}</span>
                    </div>
                    <div className={styles.scoreRing}>{vehicle.score}<small>Fit</small></div>
                    <div><span className={statusClass(vehicle.tone)}>{vehicle.status}</span><small>{vehicle.blockerDetail}</small></div>
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
              {glanceMetrics.map((metric) => (
                <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.delta}</small></div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Risk Queues</h2><a href="#command-center">View All</a></div>
            <div className={styles.railList}>
              {riskQueues.map((queue) => <div key={queue.label}><span>{queue.label}</span><strong className={toneClass(queue.tone)}>{queue.value}</strong></div>)}
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
              {leadHealthSignals.map((signal) => {
                const Icon = signal.icon;
                return <span key={signal.label}><Icon size={14} /> {signal.label}</span>;
              })}
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
            <div className={styles.railHeader}><h2>MVP Definition</h2><ClipboardCheck size={18} /></div>
            <p className={styles.guardrailCopy}>
              {salesConsoleMvpDefinition.operatingBoundary}
            </p>
            <div className={styles.mvpDefinition}>
              <strong>Included</strong>
              <ul>
                {salesConsoleMvpDefinition.includedCapabilities.slice(0, 3).map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
              <strong>Excluded</strong>
              <ul>
                {salesConsoleMvpDefinition.excludedCapabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Read-Only Action Guardrails</h2><ShieldCheck size={18} /></div>
            <div className={styles.actionGuardrailList}>
              {salesConsoleMvpExecution.readOnlyGuardrails.map((guardrail) => (
                <article key={guardrail.action}>
                  <strong>{guardrail.action}</strong>
                  <span className={executionStatusClass(guardrail.status)}>{guardrail.status}</span>
                  <small>{guardrail.reason}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Execution Data Contract</h2><Gauge size={18} /></div>
            <div className={styles.executionDataList}>
              {salesConsoleMvpExecution.dataContractFields.map((field) => (
                <article key={field.field}>
                  <div>
                    <strong>{field.field}</strong>
                    <span>{field.surface}</span>
                  </div>
                  <span className={freshnessClass(field.freshness)}>{field.freshness}</span>
                  <small>{field.source}</small>
                  <em>{field.fallbackLabel}</em>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Live Data Contract</h2><Gauge size={18} /></div>
            <p className={styles.guardrailCopy}>{salesConsoleMvpLiveDataContract.boundary}</p>
            <div className={styles.liveSourceList}>
              {salesConsoleMvpLiveDataContract.liveSources.map((source) => (
                <article key={source.id}>
                  <div>
                    <strong>{source.name}</strong>
                    <span>{source.owner}</span>
                  </div>
                  <span className={liveSourceStatusClass(source.status)}>{source.status}</span>
                  <small>Feeds: {source.feeds.join(", ")}</small>
                  <em>{source.fallback}</em>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Real Data Wiring</h2><Gauge size={18} /></div>
            <p className={styles.guardrailCopy}>{salesConsoleMvpRealDataWiring.boundary}</p>
            <div className={styles.liveSourceList}>
              {salesConsoleMvpRealDataWiring.connectedSources.map((source) => (
                <article key={source.source}>
                  <div>
                    <strong>{source.source}</strong>
                    <span>Feeds: {source.surfaces.join(", ")}</span>
                  </div>
                  <span className={realDataStatusClass(source.status)}>{source.status}</span>
                  <small>{source.fallback}</small>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              {salesConsoleMvpRealDataWiring.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Read Model Contracts</h2><FileCheck2 size={18} /></div>
            <div className={styles.readModelList}>
              {salesConsoleMvpLiveDataContract.readModels.map((model) => (
                <article key={model.surface}>
                  <strong>{model.surface}</strong>
                  <span>Key: {model.recordKey}</span>
                  <small>Required: {model.requiredFields.join(", ")}</small>
                  <em>{model.placeholderRule}</em>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Source Link Contracts</h2><ChevronRight size={18} /></div>
            <div className={styles.sourceLinkList}>
              {salesConsoleMvpLiveDataContract.sourceLinks.map((link) => (
                <article key={link.label}>
                  <strong>{link.label}</strong>
                  <code>{link.routePattern}</code>
                  <span className={freshnessClass(link.freshness)}>{link.freshness}</span>
                  <small>{link.unavailableLabel}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Adapter Source Links</h2><ChevronRight size={18} /></div>
            <div className={styles.sourceLinkList}>
              {adapterSourceLinks.map((link) => (
                <article key={`${link.owner}-${link.label}-${link.href}`}>
                  <strong>{link.label}</strong>
                  <code>{link.href}</code>
                  <span className={freshnessClass(link.state)}>{link.state}</span>
                  <small>{link.owner}: {link.unavailableLabel}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Read Adapter Preview</h2><FileCheck2 size={18} /></div>
            <p className={styles.guardrailCopy}>
              Read-only adapter output from mock source-shaped records. No source records are changed.
            </p>
            <div className={styles.adapterPreviewGrid}>
              <article>
                <strong>Seller queue</strong>
                <span>{salesConsoleReadAdapterPreview.sellerQueue.length} normalized items</span>
                <small>{salesConsoleReadAdapterPreview.sellerQueue[0]?.customer}: {salesConsoleReadAdapterPreview.sellerQueue[0]?.blocker}</small>
              </article>
              <article>
                <strong>Lead operations</strong>
                <span>{salesConsoleReadAdapterPreview.leadOperations.length} lead signals</span>
                <small>{salesConsoleReadAdapterPreview.leadOperations[1]?.label}: {salesConsoleReadAdapterPreview.leadOperations[1]?.slaLabel}</small>
              </article>
              <article>
                <strong>Inventory intelligence</strong>
                <span>{salesConsoleReadAdapterPreview.inventoryMatches.length} vehicle matches</span>
                <small>{salesConsoleReadAdapterPreview.inventoryMatches[1]?.status}: {salesConsoleReadAdapterPreview.inventoryMatches[1]?.blockerDetail}</small>
              </article>
              <article>
                <strong>Manager risks</strong>
                <span>{salesConsoleReadAdapterPreview.managerRisks.length} aggregated risks</span>
                <small>{salesConsoleReadAdapterPreview.managerRisks.map((risk) => `${risk.label} ${risk.count}`).join(" · ")}</small>
              </article>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Adapter Safety Rules</h2><ShieldCheck size={18} /></div>
            <div className={styles.adapterRuleList}>
              {salesConsoleMvpLiveDataContract.adapterRules.map((rule) => (
                <article key={rule.rule}>
                  <strong>{rule.rule}</strong>
                  <span>{rule.enforcement}</span>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Pilot Readiness Smoke</h2><CheckCircle2 size={18} /></div>
            <div className={styles.pilotReadinessList}>
              {salesConsoleMvpExecution.pilotReadinessChecks.map((check) => (
                <article key={check.check}>
                  <strong>{check.check}</strong>
                  <span className={executionStatusClass(check.status)}>{check.status}</span>
                  <small>{check.evidence}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Recommended MVP Boundary</h2><CheckCircle2 size={18} /></div>
            <div className={styles.boundaryCard}>
              <strong>{salesConsoleMvpDefinition.recommendedMvpBoundary.recommendation}</strong>
              <span>{salesConsoleMvpDefinition.recommendedMvpBoundary.releaseLine}</span>
              <small>Pilot mode: {salesConsoleMvpDefinition.recommendedMvpBoundary.pilotMode}</small>
              <small>Success standard: {salesConsoleMvpDefinition.recommendedMvpBoundary.successStandard}</small>
              <em>Expansion trigger: {salesConsoleMvpDefinition.recommendedMvpBoundary.expansionTrigger}</em>
            </div>
            <div className={styles.boundaryList}>
              {salesConsoleMvpDefinition.recommendedMvpBoundary.nonNegotiables.map((item) => (
                <span key={item}><ShieldCheck size={13} /> {item}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>MVP Roles &amp; Permissions</h2><UserRoundCheck size={18} /></div>
            <div className={styles.rolePermissionList}>
              {salesConsoleMvpDefinition.rolesAndPermissions.map((role) => (
                <article key={role.role}>
                  <strong>{role.role}</strong>
                  <span>Can see: {role.canSee.join("; ")}</span>
                  <span>Cannot do: {role.cannotDo.join("; ")}</span>
                  <small>{role.mvpControl}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>MVP Data Source Map</h2><Gauge size={18} /></div>
            <div className={styles.dataSourceList}>
              {salesConsoleMvpDefinition.dataSourceMap.map((source) => (
                <article key={source.surface}>
                  <strong>{source.surface}</strong>
                  <span>{source.source}</span>
                  <small>Fields: {source.fields}</small>
                  <small>Freshness: {source.freshness}</small>
                  <em>Fallback: {source.fallback}</em>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>MVP Pilot Acceptance Checklist</h2><ClipboardCheck size={18} /></div>
            <div className={styles.acceptanceList}>
              {salesConsoleMvpDefinition.pilotAcceptanceChecklist.map((check) => (
                <article key={check.item}>
                  <CheckCircle2 size={14} />
                  <div>
                    <strong>{check.item}</strong>
                    <span>{check.proof}</span>
                    <small>Owner: {check.owner}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>What Is Included In The MVP</h2><FileCheck2 size={18} /></div>
            <div className={styles.includedMvpList}>
              {salesConsoleMvpDefinition.includedInMvp.map((item) => (
                <article key={item.area}>
                  <strong>{item.area}</strong>
                  <ul>
                    {item.includes.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                  <small>{item.outcome}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>What Is Excluded From The MVP</h2><AlertTriangle size={18} /></div>
            <div className={styles.scopeReviewList}>
              {salesConsoleMvpDefinition.excludedFromMvp.map((item) => (
                <article key={item.capability}>
                  <strong>{item.capability}</strong>
                  <span>{item.reason}</span>
                  <small>Future path: {item.futurePath}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>MVP Build Order</h2><Clock3 size={18} /></div>
            <div className={styles.buildOrderList}>
              {salesConsoleMvpDefinition.buildOrder.map((item) => (
                <article key={item.step}>
                  <span>{item.step}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.deliverable}</small>
                    <em>{item.dependency}</em>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>MVP Decision Gates</h2><ShieldCheck size={18} /></div>
            <div className={styles.decisionGateList}>
              {salesConsoleMvpDefinition.decisionGates.map((item) => (
                <article key={item.gate}>
                  <strong>{item.gate}</strong>
                  <span>{item.question}</span>
                  <small>Pass: {item.passSignal}</small>
                  <em>If not passed: {item.ifNotPassed}</em>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>MVP Principles</h2><ShieldCheck size={18} /></div>
            <div className={styles.principleList}>
              {salesConsoleMvpDefinition.principles.map((principle) => (
                <article key={principle.name}>
                  <strong>{principle.name}</strong>
                  <span>{principle.meaning}</span>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>MVP Milestone Roadmap</h2><Gauge size={18} /></div>
            <div className={styles.milestoneList}>
              {salesConsoleMvpDefinition.milestoneRoadmap.map((item) => (
                <article key={item.id}>
                  <span>{item.id}</span>
                  <div>
                    <strong>{item.milestone}</strong>
                    <small>{item.exitProof}</small>
                  </div>
                </article>
              ))}
            </div>
            <p className={styles.guardrailCopy}>
              Roadmap continues through {salesConsoleMvpDefinition.milestoneRoadmap.at(-1)?.id}: pilot review and stabilization.
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
