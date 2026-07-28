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
import { salesConsoleAuditReadModel, sensitiveActionsHaveAuditCoverage } from "./sales-console-m9-audit-trails";
import {
  enterpriseSourceContractsBlockWritesWhenMissing,
  enterpriseSourceContractsCoverRequiredRecords,
  enterpriseSourceContractsHaveHonestLabels,
  enterpriseSourcesRemainSystemsOfRecord,
  salesConsoleEnterpriseIntegrationReadModel
} from "./sales-console-m9-crm-dms-integration-contracts";
import {
  messagingFoundationIsDisabled,
  messagingHasAuditAndPermissionCoverage,
  messagingRequiresConsentPreviewAndOptOut,
  salesConsoleCustomerMessagingReadModel
} from "./sales-console-m9-customer-messaging";
import {
  dealWorkflowIsReadOnly,
  dealWorkflowRequiresAuditAndPermission,
  salesConsoleDealWorkflowReadModel,
  salespersonCannotApproveOrFinance
} from "./sales-console-m9-deal-workflow";
import {
  financeHandoffHasAuditAndPermissionCoverage,
  financeHandoffRemainsReadOnly,
  salesConsoleFinanceHandoffReadModel,
  salespersonCannotSeeRestrictedFinanceFields
} from "./sales-console-m9-finance-handoff";
import {
  forecastRowsHaveConfidenceAndFreshness,
  restrictedForecastMetricsAreRoleLimited,
  salesConsoleForecastReadModel,
  staleForecastInputsLowerConfidence
} from "./sales-console-m9-forecasting";
import {
  managerApprovalFoundationIsDisabled,
  managerApprovalsRequireAuditThresholdAndReason,
  onlyManagersAndAdminsCanDecideApprovals,
  salesConsoleManagerApprovalReadModel
} from "./sales-console-m9-manager-approvals";
import {
  quoteScenarioBuilderIsEstimateOnly,
  quoteScenarioHasAuditAndPermissionCoverage,
  quoteScenarioRequiresReviewAndFinanceVerification,
  salesConsoleQuoteScenarioReadModel
} from "./sales-console-m9-quote-scenario-builder";
import {
  salesConsoleVehicleHoldReadModel,
  staleOrVerifyFirstInventoryBlocksHold,
  vehicleHoldFoundationIsDisabled,
  vehicleHoldsHaveAuditAndPermissionCoverage,
  vehicleHoldsRequireManagerApprovalExpiryAndVerification
} from "./sales-console-m9-vehicle-holds";
import {
  enterprisePermissionGatesDenyByDefault,
  salesConsoleEnterprisePermissionReadModel,
  sensitiveWorkflowsHavePermissionAndAuditCoverage
} from "./sales-console-m9-enterprise-permissions";
import { salesConsolePilotReadiness } from "./sales-console-mvp-pilot-readiness";
import { salesConsoleProductionReadiness } from "./sales-console-mvp-production-readiness";
import { salesConsoleReadAdapterPreview } from "./sales-console-mvp-read-adapters";
import { salesConsoleMvpRealDataWiring } from "./sales-console-mvp-real-data-wiring";
import { salesConsoleRoleViews } from "./sales-console-mvp-role-views";
import styles from "./sales-console-prototype.module.css";

const salesConsoleReadModel = salesConsoleReadAdapterPreview;

const activeRoleView = salesConsoleRoleViews.find((role) => role.role === salesConsoleMvpExecution.defaultRole) ?? salesConsoleRoleViews[0];

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

function pilotStatusClass(status: "blocked" | "ready" | "review") {
  if (status === "ready") return styles.statusGood;
  if (status === "blocked") return styles.statusDanger;
  return styles.statusWarning;
}

function barStyle(width: string) {
  return { "--bar-size": width } as CSSProperties;
}

export function SalesConsolePrototype() {
  return (
    <section className={styles.console} aria-label="Enterprise Sales Console">
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
          <button aria-disabled="true" disabled title="Messaging automation is planned, not active in the read-only production MVP." type="button">
            <MessageSquareText size={16} /> Messages <b>planned</b>
          </button>
          <button type="button"><CalendarDays size={16} /> Calendar</button>
          <button type="button"><HelpCircle size={16} /> Help</button>
          <button type="button">All Stores <ChevronDown size={14} /></button>
        </div>
      </header>

      <section className={styles.executionFoundation} aria-label="Sales Console production MVP foundation">
        <div>
          <span className={styles.eyebrow}>Production foundation</span>
          <h2>Read-only production MVP shell</h2>
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
        {salesConsoleRoleViews.map((role) => (
          <article className={role.role === salesConsoleMvpExecution.defaultRole ? styles.activeRoleCard : undefined} key={role.role}>
            <strong>{role.label}</strong>
            <span>{role.defaultSurface}</span>
            <small>{role.sensitiveDataBoundary}</small>
            <em>{role.readOnly ? "Read-only role view" : "Write-enabled"}</em>
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
          <section className={styles.panel} aria-label="Admin review audit trail foundation">
            <div className={styles.railHeader}><h2>Audit Trail Foundation</h2><FileCheck2 size={18} /></div>
            <p className={styles.guardrailCopy}>
              Enterprise actions stay disabled until actor, role, source record, timestamp, reason, and before/after summaries are audit-ready.
            </p>
            <div className={styles.auditCoverageList}>
              {salesConsoleAuditReadModel.futureActionCoverage.map((coverage) => (
                <article key={coverage.action}>
                  <div>
                    <strong>{coverage.action}</strong>
                    <span>{coverage.auditEventType} · {coverage.sourceRecordType}</span>
                  </div>
                  <span className={styles.statusWarning}>{coverage.coverage}</span>
                  <small>{coverage.requiredFields.join(", ")}</small>
                </article>
              ))}
            </div>
            <div className={styles.auditEventList}>
              {salesConsoleAuditReadModel.events.map((event) => (
                <article key={event.auditId}>
                  <strong>{event.eventType}</strong>
                  <span>{event.auditId} · {event.actor.displayName} · {event.actor.role} · {event.sourceRecord.sourceSystem}</span>
                  <small>Source: {event.sourceRecord.type} {event.sourceRecord.recordId}</small>
                  <small>{event.reason}</small>
                  <em>{event.beforeSummary} → {event.afterSummary}</em>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              <span><ShieldCheck size={13} /> {sensitiveActionsHaveAuditCoverage() ? "Sensitive actions require audit coverage" : "Audit coverage incomplete"}</span>
              {salesConsoleAuditReadModel.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="Admin review enterprise permissions">
            <div className={styles.railHeader}><h2>Enterprise Permissions</h2><UserRoundCheck size={18} /></div>
            <p className={styles.guardrailCopy}>
              Deny-by-default action gates are defined for enterprise expansion. No gated workflow is enabled yet.
            </p>
            <div className={styles.enterprisePermissionList}>
              {salesConsoleEnterprisePermissionReadModel.gates.map((gate) => (
                <article key={gate.capability}>
                  <div>
                    <strong>{gate.capability}</strong>
                    <span>Roles: {gate.allowedRoles.join(", ")}</span>
                  </div>
                  <span className={styles.statusDanger}>{gate.defaultDecision}</span>
                  <small>Scope: {gate.requiredScope}. Audit required: {String(gate.auditRequired)}. Source record required: {String(gate.sourceRecordRequired)}.</small>
                </article>
              ))}
            </div>
            <div className={styles.enterpriseScopeList}>
              {salesConsoleEnterprisePermissionReadModel.roleScopes.map((scope) => (
                <article key={scope.role}>
                  <strong>{scope.label}</strong>
                  <span>{scope.defaultScope}</span>
                  <small>{scope.storePlaceholder}</small>
                  <small>{scope.teamPlaceholder}</small>
                  <em>{scope.ownershipPlaceholder}</em>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              <span><ShieldCheck size={13} /> {enterprisePermissionGatesDenyByDefault() ? "Permission gates deny by default" : "Permission gate risk"}</span>
              <span><ShieldCheck size={13} /> {sensitiveWorkflowsHavePermissionAndAuditCoverage() ? "Sensitive workflows have audit and permission coverage" : "Coverage incomplete"}</span>
              {salesConsoleEnterprisePermissionReadModel.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="Admin review CRM DMS integration contracts">
            <div className={styles.railHeader}><h2>CRM/DMS Integration Contracts</h2><Gauge size={18} /></div>
            <p className={styles.guardrailCopy}>
              Enterprise source contracts define ownership, freshness, fallback labels, and source links without replacing CRM, DMS, finance, inventory, lead, task, or appointment systems.
            </p>
            <div className={styles.enterpriseIntegrationList}>
              {salesConsoleEnterpriseIntegrationReadModel.contracts.map((contract) => (
                <article key={contract.recordType}>
                  <div>
                    <strong>{contract.recordType}</strong>
                    <span>{contract.owner} · {contract.mode}</span>
                  </div>
                  <span className={liveSourceStatusClass(contract.status)}>{contract.status}</span>
                  <small>IDs: {contract.requiredIds.join(", ")}. Link: {contract.sourceLinkPattern}</small>
                  <em>{contract.fallbackLabel} {contract.freshnessRule}</em>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              <span><ShieldCheck size={13} /> {enterpriseSourcesRemainSystemsOfRecord() ? "Sources remain systems of record" : "Source ownership risk"}</span>
              <span><ShieldCheck size={13} /> {enterpriseSourceContractsCoverRequiredRecords() ? "Required record types covered" : "Record coverage incomplete"}</span>
              <span><ShieldCheck size={13} /> {enterpriseSourceContractsHaveHonestLabels() ? "Freshness and fallback labels present" : "Labels incomplete"}</span>
              <span><ShieldCheck size={13} /> {enterpriseSourceContractsBlockWritesWhenMissing() ? "Missing sources block writes" : "Write-blocking incomplete"}</span>
              {salesConsoleEnterpriseIntegrationReadModel.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="Admin review deal workflow foundation">
            <div className={styles.railHeader}><h2>Deal Workflow Foundation</h2><ClipboardCheck size={18} /></div>
            <p className={styles.guardrailCopy}>
              Deal workflow is planned as audited stage movement only. Source-system writes, discount approvals, and finance decisions remain disabled.
            </p>
            <div className={styles.enterpriseDealWorkflowList}>
              {salesConsoleDealWorkflowReadModel.transitions.map((transition) => (
                <article key={`${transition.from}-${transition.to}`}>
                  <div>
                    <strong>{transition.label}</strong>
                    <span>{transition.from} → {transition.to}</span>
                  </div>
                  <span className={styles.statusWarning}>{transition.requiredRole}</span>
                  <small>Audit required: {String(transition.auditRequired)}. Source write: {String(transition.sourceWrite)}. Enabled: {String(transition.enabled)}.</small>
                </article>
              ))}
            </div>
            <div className={styles.enterpriseDealWorkflowList}>
              {salesConsoleDealWorkflowReadModel.managerReviewPlaceholders.map((review) => (
                <article key={review.dealId}>
                  <div>
                    <strong>{review.dealId}</strong>
                    <span>{review.auditEventType} · {review.managerAction}</span>
                  </div>
                  <span className={styles.statusNeutral}>{review.status}</span>
                  <small>Reason required: {String(review.reasonRequired)}. Source record required: {String(review.sourceRecordRequired)}. Enabled: {String(review.enabled)}.</small>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              <span><ShieldCheck size={13} /> {dealWorkflowIsReadOnly() ? "Deal workflow remains read-only" : "Deal workflow write risk"}</span>
              <span><ShieldCheck size={13} /> {dealWorkflowRequiresAuditAndPermission() ? "Audit and permission gates required" : "Gate coverage incomplete"}</span>
              <span><ShieldCheck size={13} /> {salespersonCannotApproveOrFinance() ? "Salesperson cannot approve or finance" : "Salesperson authority risk"}</span>
              {salesConsoleDealWorkflowReadModel.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="Admin review manager approvals foundation">
            <div className={styles.railHeader}><h2>Manager Approval Foundation</h2><ShieldCheck size={18} /></div>
            <p className={styles.guardrailCopy}>
              Approval queues are contract-only. Thresholds, reasons, manager/admin role gates, and audit events are required before any decision can execute.
            </p>
            <div className={styles.enterpriseApprovalList}>
              {salesConsoleManagerApprovalReadModel.requestContracts.map((approval) => (
                <article key={approval.approvalType}>
                  <div>
                    <strong>{approval.approvalType}</strong>
                    <span>Request role: {approval.requestRole}</span>
                  </div>
                  <span className={styles.statusDanger}>disabled</span>
                  <small>Fields: {approval.requiredFields.join(", ")}. Reason: {String(approval.reasonRequired)}. Threshold: {String(approval.thresholdRequired)}.</small>
                </article>
              ))}
              {salesConsoleManagerApprovalReadModel.decisionGates.map((gate) => (
                <article key={`${gate.approvalType}-decision`}>
                  <div>
                    <strong>{gate.approvalType} decision</strong>
                    <span>Roles: {gate.allowedDecisionRoles.join(", ")}</span>
                  </div>
                  <span className={styles.statusWarning}>{gate.auditEventType}</span>
                  <small>Decision enabled: {String(gate.decisionEnabled)}. Deny by default: {String(gate.denyByDefault)}.</small>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              <span><ShieldCheck size={13} /> {managerApprovalFoundationIsDisabled() ? "Approval execution disabled" : "Approval execution risk"}</span>
              <span><ShieldCheck size={13} /> {managerApprovalsRequireAuditThresholdAndReason() ? "Audit, threshold, and reason required" : "Approval gate incomplete"}</span>
              <span><ShieldCheck size={13} /> {onlyManagersAndAdminsCanDecideApprovals() ? "Only managers/admins can decide later" : "Decision role risk"}</span>
              {salesConsoleManagerApprovalReadModel.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="Admin review quote scenario builder foundation">
            <div className={styles.railHeader}><h2>Quote Scenario Builder Foundation</h2><BadgeDollarSign size={18} /></div>
            <p className={styles.guardrailCopy}>
              Scenario builder is estimate-only. Final quote submission stays disabled until disclaimers, manager review, finance verification, audit, and source-system gates are approved.
            </p>
            <div className={styles.enterpriseScenarioList}>
              {salesConsoleQuoteScenarioReadModel.scenarios.map((scenario) => (
                <article key={scenario.scenarioId}>
                  <div>
                    <strong>{scenario.scenarioId}</strong>
                    <span>{scenario.version} · estimate-only</span>
                  </div>
                  <span className={styles.statusDanger}>submission disabled</span>
                  <small>Inputs: {scenario.requiredInputs.join(", ")}</small>
                  <small>Disclaimer: {String(scenario.disclaimerRequired)}. Manager review: {String(scenario.managerReviewRequired)}. Finance verification: {String(scenario.financeVerificationRequired)}.</small>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              <span><ShieldCheck size={13} /> {quoteScenarioBuilderIsEstimateOnly() ? "Estimate-only scenarios" : "Quote submission risk"}</span>
              <span><ShieldCheck size={13} /> {quoteScenarioRequiresReviewAndFinanceVerification() ? "Review and finance verification required" : "Review gate incomplete"}</span>
              <span><ShieldCheck size={13} /> {quoteScenarioHasAuditAndPermissionCoverage() ? "Audit and permission coverage present" : "Quote coverage incomplete"}</span>
              {salesConsoleQuoteScenarioReadModel.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="Admin review finance handoff foundation">
            <div className={styles.railHeader}><h2>Finance Handoff Foundation</h2><HandCoins size={18} /></div>
            <p className={styles.guardrailCopy}>
              Finance handoff is package/status visibility only. Restricted finance fields stay role-limited, and finance decisions remain outside the Sales Console.
            </p>
            <div className={styles.enterpriseFinanceList}>
              {salesConsoleFinanceHandoffReadModel.packages.map((handoff) => (
                <article key={handoff.handoffId}>
                  <div>
                    <strong>{handoff.handoffId}</strong>
                    <span>{handoff.status} · review-only</span>
                  </div>
                  <span className={styles.statusDanger}>decision disabled</span>
                  <small>Fields: {handoff.requiredFields.join(", ")}</small>
                </article>
              ))}
              {salesConsoleFinanceHandoffReadModel.visibilityRules.map((rule) => (
                <article key={rule.field}>
                  <div>
                    <strong>{rule.field}</strong>
                    <span>Visible to: {rule.visibleTo.join(", ")}</span>
                  </div>
                  <span className={rule.restricted ? styles.statusWarning : styles.statusGood}>{rule.restricted ? "restricted" : "limited"}</span>
                  <small>Restricted finance field: {String(rule.restricted)}</small>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              <span><ShieldCheck size={13} /> {financeHandoffRemainsReadOnly() ? "Finance handoff remains read-only" : "Finance handoff write risk"}</span>
              <span><ShieldCheck size={13} /> {salespersonCannotSeeRestrictedFinanceFields() ? "Salespeople cannot see restricted finance fields" : "Finance privacy risk"}</span>
              <span><ShieldCheck size={13} /> {financeHandoffHasAuditAndPermissionCoverage() ? "Audit and permission coverage present" : "Finance coverage incomplete"}</span>
              {salesConsoleFinanceHandoffReadModel.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="Admin review customer messaging foundation">
            <div className={styles.railHeader}><h2>Customer Messaging Foundation</h2><MessageSquareText size={18} /></div>
            <p className={styles.guardrailCopy}>
              Messaging is consent-gated and disabled. No automation or send workflow is active in the Sales Console.
            </p>
            <div className={styles.enterpriseMessagingList}>
              {salesConsoleCustomerMessagingReadModel.drafts.map((draft) => (
                <article key={draft.draftId}>
                  <div>
                    <strong>{draft.draftId}</strong>
                    <span>{draft.customerId} · {draft.templateId}</span>
                  </div>
                  <span className={styles.statusDanger}>send disabled</span>
                  <small>Enabled: {String(draft.enabled)}. Send: {String(draft.sendEnabled)}. Automation: {String(draft.automationEnabled)}.</small>
                </article>
              ))}
              {salesConsoleCustomerMessagingReadModel.templates.map((template) => (
                <article key={template.templateId}>
                  <div>
                    <strong>{template.templateId}</strong>
                    <span>{template.channel} · {template.useCase}</span>
                  </div>
                  <span className={template.approved ? styles.statusGood : styles.statusWarning}>{template.approved ? "approved template" : "template review"}</span>
                  <small>Consent required: {String(salesConsoleCustomerMessagingReadModel.consentRule.consentRequired)}. Opt-out check: {String(salesConsoleCustomerMessagingReadModel.consentRule.optOutCheckRequired)}.</small>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              <span><ShieldCheck size={13} /> {messagingFoundationIsDisabled() ? "Messaging send and automation disabled" : "Messaging activation risk"}</span>
              <span><ShieldCheck size={13} /> {messagingRequiresConsentPreviewAndOptOut() ? "Consent, preview, opt-out, and rate limit required" : "Messaging consent gate incomplete"}</span>
              <span><ShieldCheck size={13} /> {messagingHasAuditAndPermissionCoverage() ? "Audit and permission coverage present" : "Messaging coverage incomplete"}</span>
              {salesConsoleCustomerMessagingReadModel.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="Admin review vehicle holds foundation">
            <div className={styles.railHeader}><h2>Vehicle Holds Foundation</h2><CarFront size={18} /></div>
            <p className={styles.guardrailCopy}>
              Vehicle holds are request-contract only. Manager approval, expiration, inventory verification, audit, and source-system gates are required before activation.
            </p>
            <div className={styles.enterpriseHoldList}>
              {salesConsoleVehicleHoldReadModel.requests.map((hold) => (
                <article key={hold.holdId}>
                  <div>
                    <strong>{hold.holdId}</strong>
                    <span>{hold.stockNumber} · {hold.customerId}</span>
                  </div>
                  <span className={freshnessClass(hold.status === "verify-first" ? "verify-first" : "placeholder")}>{hold.status}</span>
                  <small>Manager approval: {String(hold.managerApprovalRequired)}. Expiration: {String(hold.expirationRequired)}. Source write: {String(hold.sourceWrite)}. Enabled: {String(hold.enabled)}.</small>
                </article>
              ))}
              {salesConsoleVehicleHoldReadModel.limits.map((limit) => (
                <article key={limit.scope}>
                  <div>
                    <strong>{limit.scope} hold limit</strong>
                    <span>{limit.limit}</span>
                  </div>
                  <span className={styles.statusWarning}>planned limit</span>
                  <small>{limit.reason}</small>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              <span><ShieldCheck size={13} /> {vehicleHoldFoundationIsDisabled() ? "Vehicle holds disabled" : "Vehicle hold activation risk"}</span>
              <span><ShieldCheck size={13} /> {vehicleHoldsRequireManagerApprovalExpiryAndVerification() ? "Manager approval, expiry, and verification required" : "Hold gate incomplete"}</span>
              <span><ShieldCheck size={13} /> {staleOrVerifyFirstInventoryBlocksHold() ? "Verify-first inventory blocks holds" : "Inventory hold risk"}</span>
              <span><ShieldCheck size={13} /> {vehicleHoldsHaveAuditAndPermissionCoverage() ? "Audit and permission coverage present" : "Hold coverage incomplete"}</span>
              {salesConsoleVehicleHoldReadModel.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="Admin review enterprise forecasting foundation">
            <div className={styles.railHeader}><h2>Enterprise Forecasting Foundation</h2><LineChart size={18} /></div>
            <p className={styles.guardrailCopy}>
              Forecasting is read-only. Rows include confidence, freshness, source input summary, and role-limited visibility for restricted gross/finance metrics.
            </p>
            <div className={styles.enterpriseForecastList}>
              {salesConsoleForecastReadModel.forecastRows.map((row) => (
                <article key={row.metric}>
                  <div>
                    <strong>{row.metric}</strong>
                    <span>{row.value} · confidence {row.confidence}</span>
                  </div>
                  <span className={freshnessClass(row.freshness)}>{row.freshness}</span>
                  <small>Visible to: {row.visibleTo.join(", ")}. Restricted: {String(row.restricted)}.</small>
                  <small>{row.inputSummary}</small>
                </article>
              ))}
            </div>
            <div className={styles.boundaryList}>
              <span><ShieldCheck size={13} /> {forecastRowsHaveConfidenceAndFreshness() ? "Confidence and freshness visible" : "Forecast labels incomplete"}</span>
              <span><ShieldCheck size={13} /> {restrictedForecastMetricsAreRoleLimited() ? "Restricted metrics role-limited" : "Forecast visibility risk"}</span>
              <span><ShieldCheck size={13} /> {staleForecastInputsLowerConfidence() ? "Stale inputs lower confidence" : "Forecast confidence risk"}</span>
              {salesConsoleForecastReadModel.guardrails.map((guardrail) => (
                <span key={guardrail}><ShieldCheck size={13} /> {guardrail}</span>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Production MVP</h2><ShieldCheck size={18} /></div>
            <p className={styles.guardrailCopy}>
              Stable read-only operating console. Planning and configuration evidence is separated into admin review panels.
            </p>
            <div className={styles.productionReadinessList}>
              {salesConsoleProductionReadiness.productionChecks.map((check) => (
                <article key={check.check}>
                  <strong>{check.check}</strong>
                  <span className={pilotStatusClass(check.status)}>{check.status}</span>
                  <small>{check.evidence} Owner: {check.owner}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Production Surface Boundary</h2><Gauge size={18} /></div>
            <div className={styles.surfaceBoundaryList}>
              {salesConsoleProductionReadiness.operationalSurfaces.map((surface) => (
                <article key={surface.surface}>
                  <strong>{surface.surface}</strong>
                  <span className={styles.statusGood}>{surface.audience}</span>
                  <small>{surface.reason}</small>
                </article>
              ))}
              {salesConsoleProductionReadiness.adminReviewSurfaces.map((surface) => (
                <article key={surface.surface}>
                  <strong>{surface.surface}</strong>
                  <span className={styles.statusWarning}>{surface.audience}</span>
                  <small>{surface.reason}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Production Empty States</h2><HelpCircle size={18} /></div>
            <div className={styles.emptyStateList}>
              {salesConsoleProductionReadiness.emptyStates.map((state) => (
                <article key={state.surface}>
                  <strong>{state.surface}</strong>
                  <span>{state.userMessage}</span>
                  <small>{state.verification}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Role-Based Console</h2><UserRoundCheck size={18} /></div>
            <p className={styles.guardrailCopy}>
              Active production MVP role: {activeRoleView?.label}. Source records stay as the system of record; this console only changes visibility.
            </p>
            <div className={styles.roleViewList}>
              {salesConsoleRoleViews.map((role) => (
                <article key={role.role}>
                  <div>
                    <strong>{role.label}</strong>
                    <span>Default: {role.defaultSurface}</span>
                  </div>
                  <span className={role.role === salesConsoleMvpExecution.defaultRole ? styles.statusGood : styles.statusNeutral}>
                    {role.role === salesConsoleMvpExecution.defaultRole ? "pilot default" : "available"}
                  </span>
                  <small>Visible: {role.visibleSurfaces.join(", ")}</small>
                  <small>Restricted: {role.restrictedSurfaces.length > 0 ? role.restrictedSurfaces.join(", ") : "None in read-only pilot"}</small>
                  <em>{role.placeholderBehavior}</em>
                  <div className={styles.roleViewMetrics}>
                    <span>{role.sellerQueueVisible} seller items</span>
                    <span>{role.leadSignalsVisible} lead signals</span>
                    <span>{role.managerRisksVisible} manager risks</span>
                    <span>{role.dealsVisible} deals</span>
                    <span>{role.inventoryMatchesVisible} vehicles</span>
                    <span>{role.blockedActionCount} actions disabled/planned</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-label="Admin review pilot readiness">
            <div className={styles.railHeader}><h2>Pilot-Ready MVP</h2><ClipboardCheck size={18} /></div>
            <p className={styles.guardrailCopy}>
              Admin review evidence from the limited pilot phase. A manager should understand the day&apos;s priorities within 30 seconds.
            </p>
            <div className={styles.priorityBriefList}>
              {salesConsolePilotReadiness.priorityBrief.length > 0 ? (
                salesConsolePilotReadiness.priorityBrief.map((priority) => (
                  <article key={priority}><AlertTriangle size={14} /><span>{priority}</span></article>
                ))
              ) : (
                <article><HelpCircle size={14} /><span>No priority work is available. Check source systems before using the console.</span></article>
              )}
            </div>
            <div className={styles.pilotReadinessList}>
              {salesConsolePilotReadiness.readinessChecks.map((check) => (
                <article key={check.check}>
                  <strong>{check.check}</strong>
                  <span className={pilotStatusClass(check.status)}>{check.status}</span>
                  <small>{check.evidence} Owner: {check.owner}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Pilot State Verification</h2><ShieldCheck size={18} /></div>
            <div className={styles.stateVerificationList}>
              {salesConsolePilotReadiness.stateVerification.map((state) => (
                <article key={state.label}>
                  <strong>{state.label}</strong>
                  <span className={pilotStatusClass(state.status)}>{state.count}</span>
                  <small>{state.meaning}</small>
                </article>
              ))}
            </div>
          </section>

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
            <div className={styles.railHeader}><h2>Pilot Acceptance Tracking</h2><ClipboardCheck size={18} /></div>
            <div className={styles.pilotReadinessList}>
              {salesConsolePilotReadiness.acceptanceTracker.map((check) => (
                <article key={check.item}>
                  <strong>{check.item}</strong>
                  <span className={pilotStatusClass(check.status)}>{check.status}</span>
                  <small>{check.proof} Owner: {check.owner}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.railHeader}><h2>Pilot Empty &amp; Fallback States</h2><HelpCircle size={18} /></div>
            <div className={styles.emptyStateList}>
              {salesConsolePilotReadiness.fallbackStates.map((state) => (
                <article key={state.surface}>
                  <strong>{state.surface}</strong>
                  <span>{state.emptyLabel}</span>
                  <small>{state.fallbackAction}</small>
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
