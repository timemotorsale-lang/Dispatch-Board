import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Gauge,
  UsersRound
} from "lucide-react";
import Link from "next/link";

import type { TimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";
import type { TimeAttendanceCaptureState } from "@/server/time-attendance/capture-state";
import type { TimeAttendanceManagerReviewQueue } from "@/server/time-attendance/manager-review";
import type { PayrollHandoffReadiness } from "@/server/time-attendance/payroll-handoff-service";

import { PayrollHandoffPanel } from "./payroll-handoff-panel";
import { OperationalHealthPanel } from "./operational-health-panel";
import { PolicyAdministrationPanel } from "./policy-administration-panel";
import { TimeAttendanceCapturePanel } from "./time-attendance-capture-panel";
import { TimeAttendanceCommandBar, type TimeAttendanceCommandItem } from "./time-attendance-command-bar";
import { TimeAttendanceInboxDrawer } from "./time-attendance-inbox-drawer";
import { TimeCardAttestationPanel } from "./time-card-attestation-panel";
import { TimeCardCorrectionPanel } from "./time-card-correction-panel";
import { TimeAttendanceManagerReviewPanel } from "./time-attendance-manager-review-panel";
import { TimeOffRequestPanel } from "./time-off-request-panel";
import { PersonalPeriodPanel } from "./personal-period-panel";
import { TimeCardToolLink } from "./time-card-tool-link";
import type { PersonalTimeCardPeriods } from "@/server/time-attendance/personal-periods";
import type { MyTimeOffWorkspace } from "@/server/time-attendance/time-off-workspace";
import type { getMyWorkSchedule } from "@/server/time-attendance/my-work-schedule";
import type { PersonalJobLabor } from "@/server/time-attendance/personal-job-labor";
import type { PayrollBatchHistoryEntry } from "@/server/time-attendance/payroll-batch-history";
import { MyWorkSchedulePanel } from "./my-work-schedule-panel";
import { PersonalJobLaborPanel } from "./personal-job-labor-panel";
import { PayrollBatchHistoryPanel } from "./payroll-batch-history-panel";
import styles from "./time-attendance-console.module.css";

type TimeAttendanceConsoleProps = {
  activeView: "today" | "my-time" | "schedule" | "manager" | "policies" | "payroll";
  captureState: TimeAttendanceCaptureState;
  managerReviewQueue: TimeAttendanceManagerReviewQueue;
  model: TimeAttendanceConsoleModel;
  payrollReadiness: PayrollHandoffReadiness;
  density: "calm" | "high";
  workspaceHref: string;
  history?: PersonalTimeCardPeriods;
  historicalSelection?: boolean;
  hasRequestedPeriod?: boolean;
  correctionDate?: string;
  employeeAction?: keyof typeof employeeTools;
  showOperationalHealth?: boolean;
  reviewItem?: string;
  timeOffWorkspace?: MyTimeOffWorkspace;
  schedule?: Awaited<ReturnType<typeof getMyWorkSchedule>>;
  jobLabor?: PersonalJobLabor;
  payrollBatches?: PayrollBatchHistoryEntry[] | null;
  selectedPayrollBatchId?: string;
};

const employeeTools = {
  correction: { label: "Request correction", section: "correction-request" },
  confirm: { label: "Confirm or dispute card", section: "card-attestation" },
  leave: { label: "Request time off", section: "time-off-request" },
  punches: { label: "View punches", section: "punch-timeline" }
};

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function chipClass(tone: "good" | "warning" | "danger" | "neutral") {
  if (tone === "good") return styles.chipGood;
  if (tone === "warning") return styles.chipWarning;
  if (tone === "danger") return styles.chipDanger;
  return styles.chipNeutral;
}

function dotClass(tone: "good" | "warning" | "neutral") {
  if (tone === "good") return styles.dotGood;
  if (tone === "warning") return styles.dotWarning;
  return styles.dotNeutral;
}

export function TimeAttendanceConsole({ activeView, captureState, density, managerReviewQueue, model, payrollReadiness, workspaceHref, history, historicalSelection = false, hasRequestedPeriod = false, correctionDate, employeeAction, showOperationalHealth, reviewItem, timeOffWorkspace, schedule, jobLabor, payrollBatches, selectedPayrollBatchId }: TimeAttendanceConsoleProps) {
  const isEmployeeView = !historicalSelection && (activeView === "today" || activeView === "my-time");
  const showCurrentActions = activeView === "my-time" && !historicalSelection;
  const isAdminView = activeView === "manager" || activeView === "policies" || activeView === "payroll";
  const blockingExceptionCount = model.exceptions.filter((exception) => exception.blocking).length;
  const card = model.employeeCard;
  const cardBlocked = blockingExceptionCount > 0;
  const statusTone = cardBlocked ? styles.chipDanger : card.payrollReady ? styles.chipGood : styles.chipNeutral;
  const hasOperationalHealth = (activeView === "manager" && model.permissions.manager) || activeView === "payroll";
  const healthHref = `/time-attendance?view=${activeView}&action=health#operational-health`;
  const workflowLinks = [
    ...(activeView === "manager" ? [{ href: "#manager-review", label: "Review" }] : []),
    ...(activeView === "manager" && model.permissions.manager ? [{ href: "#team-status", label: "Team" }] : []),
    ...(activeView === "payroll" ? [
      { href: "#payroll-handoff", label: "Payroll" },
      { href: "#payroll-batch-history", label: "Batch history" }
    ] : []),
  ];
  const commandItems: TimeAttendanceCommandItem[] = [
    ...(hasOperationalHealth ? [{ detail: "Open time and attendance diagnostics", href: healthHref, label: "Operational health", scope: "Page" }] : []),
    ...workflowLinks.map((link) => ({
      detail: "Jump to this section",
      href: link.href,
      label: link.label,
      scope: "Page"
    })),
    ...(model.permissions.manager ? model.team.slice(0, 8) : []).map((staff) => ({
      detail: `${staff.statusLabel} · ${minutesLabel(staff.paidMinutes)} paid`,
      href: `/time-attendance?view=manager#time-staff-${encodeURIComponent(staff.id)}`,
      label: staff.name,
      scope: "Staff"
    })),
    ...(managerReviewQueue.permitted ? managerReviewQueue.items.slice(0, 8) : []).map((item) => ({
      detail: `${item.staffName} · ${item.status} · ${item.ageLabel}`,
      href: `/time-attendance?view=manager&review=${encodeURIComponent(item.id)}#time-review-${encodeURIComponent(item.id)}`,
      label: item.title,
      scope: "Manager queue"
    }))
  ];

  return (
    <section className={`${styles.console} ${density === "high" ? styles.consoleHighVolume : ""}`} aria-label="Time and Attendance CCC console">
      <header className={styles.hero}>
        <h1>Time Card</h1>
        <div className={styles.heroCompactMeta}>
          <span>{model.currentUserName}</span>
          <Link className={styles.secondaryAction} href={workspaceHref}>Go to my workspace</Link>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Time and attendance workspaces">
        <Link aria-current={activeView === "today" ? "page" : undefined} className={activeView === "today" ? styles.tabActive : styles.tab} href="/time-attendance?view=today">Today</Link>
        <Link aria-current={activeView === "my-time" ? "page" : undefined} className={activeView === "my-time" ? styles.tabActive : styles.tab} href="/time-attendance?view=my-time">My Time</Link>
        {model.permissions.employee && <Link aria-current={activeView === "schedule" ? "page" : undefined} className={activeView === "schedule" ? styles.tabActive : styles.tab} href="/time-attendance?view=schedule">My Schedule</Link>}
        {managerReviewQueue.permitted || model.permissions.manager ? <Link aria-current={activeView === "manager" ? "page" : undefined} className={activeView === "manager" ? styles.tabActive : styles.tab} href="/time-attendance?view=manager">Manager Review</Link> : null}
        {model.permissions.policies ? <Link aria-current={activeView === "policies" ? "page" : undefined} className={activeView === "policies" ? styles.tabActive : styles.tab} href="/time-attendance?view=policies">Policies</Link> : null}
        {model.permissions.payroll ? <Link aria-current={activeView === "payroll" ? "page" : undefined} className={activeView === "payroll" ? styles.tabActive : styles.tab} href="/time-attendance?view=payroll">Payroll Handoff</Link> : null}
      </nav>

      {model.dataState === "UNAVAILABLE" ? (
        <div className={styles.captureError} role="alert"><AlertTriangle size={16} />Time card details are temporarily unavailable.</div>
      ) : null}

      {isEmployeeView ? <div id="capture-actions"><TimeAttendanceCapturePanel initialState={captureState} initialClock={model.generatedAt} /></div> : null}

      {isEmployeeView && <nav className={styles.toolBar} aria-label="Time card tools">
        <Link className={styles.ghostAction} href="/time-attendance?view=my-time#pay-periods">View pay periods</Link>
        {Object.entries(employeeTools).map(([action, tool]) => (
          <TimeCardToolLink href={`/time-attendance?view=my-time&action=${action}#${tool.section}`} key={action} {...tool} />
        ))}
      </nav>}

      {isAdminView && commandItems.length > 0 && <TimeAttendanceCommandBar items={commandItems} />}
      {workflowLinks.length > 0 && <nav className={styles.toolBar} aria-label="Jump to time card section">
        {workflowLinks.map((link) => <a href={link.href} key={link.href}>{link.label}</a>)}
        {hasOperationalHealth && <TimeCardToolLink href={healthHref} label="Operational health" section="operational-health" />}
      </nav>}

        <div className={styles.bodyGrid}>
          <div className={styles.mainStack}>
          {history && <PersonalPeriodPanel history={history} hasRequestedPeriod={hasRequestedPeriod} />}
          {schedule && <MyWorkSchedulePanel schedule={schedule} />}
          {activeView === "policies" ? <PolicyAdministrationPanel /> : null}

          {isEmployeeView ? <article className={styles.panel} id="time-card-summary">
            <div className={styles.panelHeader}>
              <div>
                <h2>Current pay period</h2>
              </div>
              <span className={statusTone}>{card.statusLabel}</span>
            </div>
            <div className={styles.cardContextLine}>
              <span>{model.employeeCard.shiftLabel}</span>
              <span>{model.employeeCard.policyLabel}</span>
              {model.employeeCard.available && <span>Version {model.employeeCard.timeCardVersion}</span>}
            </div>
            <div className={styles.timeSummary}>
              <div><span>Total span</span><strong>{minutesLabel(model.employeeCard.attendanceMinutes)}</strong></div>
              <div><span>Meal time</span><strong>{minutesLabel(model.employeeCard.mealMinutes)}</strong></div>
              <div><span>Paid time</span><strong>{minutesLabel(model.employeeCard.paidMinutes)}</strong></div>
              <div><span>Overtime</span><strong>{model.headline.overtimeHours}</strong></div>
            </div>
            {cardBlocked && <p className={styles.cardReadinessNote}>{blockingExceptionCount} payroll {blockingExceptionCount === 1 ? "blocker" : "blockers"} awaiting review.</p>}
            {showCurrentActions && card.mealPolicy && <details className={styles.assignedPolicy}>
              <summary>Assigned meal policy</summary>
              <p>{card.mealPolicy.expectedMealMinutes} minutes · {card.mealPolicy.paid ? "Paid" : "Unpaid"}</p>
            </details>}
          </article> : null}

          {showCurrentActions ? (
            <details className={styles.workflowDisclosure} id="correction-request" open={correctionDate || employeeAction === "correction" ? true : undefined}>
              <summary><span>Request correction</span></summary>
              <TimeCardCorrectionPanel key={correctionDate ?? "current"} initialDate={correctionDate} punches={model.correctionPunches ?? []} />
            </details>
          ) : null}

          {showCurrentActions && model.corrections.length ? (
            <details className={styles.workflowDisclosure}>
              <summary><span>Correction history</span><small>{model.corrections.length}</small></summary>
              <article className={styles.panel}>
                <div className={styles.panelHeader}><div><span className={styles.sectionEyebrow}>Correction history</span><h2>Requests and decisions</h2><p>Original punches remain unchanged; approved adjustments create new evidence.</p></div></div>
                <div className={styles.timeline}>{model.corrections.map((request) => <div className={styles.timelineItem} key={request.id}><div className={styles.timelineLeft}><span className={styles.dotNeutral} aria-hidden="true" /><div><strong>{request.changeType}</strong><p>{request.managerReason ?? "Awaiting a documented decision."}</p></div></div><span className={styles.timelineTime}>{request.statusLabel}</span></div>)}</div>
              </article>
            </details>
          ) : null}

          {showCurrentActions ? (
            <details className={styles.workflowDisclosure} id="card-attestation" open={employeeAction === "confirm" ? true : undefined}>
              <summary><span>Confirm or dispute card</span></summary>
              <TimeCardAttestationPanel card={model.employeeCard} />
            </details>
          ) : null}

          {showCurrentActions && timeOffWorkspace ? (
            <details className={styles.workflowDisclosure} id="time-off-request" open={employeeAction === "leave" ? true : undefined}>
              <summary><span>My Time Off</span></summary>
              <TimeOffRequestPanel workspace={timeOffWorkspace} />
            </details>
          ) : null}

          {jobLabor && <PersonalJobLaborPanel labor={jobLabor} />}

          {activeView === "manager" ? <TimeAttendanceManagerReviewPanel key={reviewItem ?? "queue"} queue={managerReviewQueue} /> : null}

          {activeView === "payroll" ? <div id="payroll-handoff"><PayrollHandoffPanel key={selectedPayrollBatchId ?? "current"} initialBatchId={selectedPayrollBatchId} initialReadiness={payrollReadiness} /></div> : null}
          {activeView === "payroll" && <div id="payroll-batch-history">{payrollBatches === null
            ? <p className={styles.captureError} role="alert">Payroll batch history is temporarily unavailable.</p>
            : <PayrollBatchHistoryPanel batches={payrollBatches ?? []} />}</div>}

          {hasOperationalHealth ? <details className={styles.workflowDisclosure} id="operational-health" open={showOperationalHealth ? true : undefined}>
            <summary><span>Operational health</span></summary>
            <OperationalHealthPanel />
          </details> : null}

          {isEmployeeView ? (
            <details className={styles.workflowDisclosure} id="punch-timeline" open={employeeAction === "punches" ? true : undefined}>
              <summary><span>Punch history</span></summary>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.sectionEyebrow}>Punch timeline</span>
                    <h2>Exact events with policy interpretation</h2>
                    <p>Recorded times remain exact. Any adjustment must be a documented correction.</p>
                  </div>
                  <Gauge aria-hidden="true" />
                </div>
                <div className={styles.timeline}>
                  {model.timeline.map((item) => (
                    <div className={styles.timelineItem} key={item.id}>
                      <div className={styles.timelineLeft}>
                        <span className={dotClass(item.tone)} aria-hidden="true" />
                        <div>
                          <strong>{item.label}</strong>
                          <p>{item.detail}</p>
                        </div>
                      </div>
                      <span className={styles.timelineTime}>{item.time}</span>
                    </div>
                  ))}
                  {model.timeline.length === 0 ? <p className={styles.mvpNote}>No persisted punch or correction events are available for the recent period.</p> : null}
                </div>
              </article>
            </details>
          ) : null}

          {activeView === "manager" && model.permissions.manager ? <article className={styles.teamPanel} id="team-status">
            <div className={styles.teamHeader}>
              <div>
                <span className={styles.sectionEyebrow}>CCC team view</span>
                <h2>Staff time status</h2>
                <p>Board-level visibility across staff policies, time status, and review needs.</p>
              </div>
              <UsersRound aria-hidden="true" />
              <Link className={styles.ghostAction} href={`/time-attendance?view=manager&density=${density === "high" ? "calm" : "high"}`}>{density === "high" ? "Calm mode" : "High-volume mode"}</Link>
            </div>
            <div className={styles.teamList}>
              {model.team.map((staff) => (
                <div className={styles.teamRow} id={`time-staff-${staff.id}`} key={staff.id}>
                  <div className={styles.teamName}>
                    <strong>{staff.name}</strong>
                    <small>{staff.role} · {staff.shift}</small>
                  </div>
                  <div className={styles.teamStatus}>
                    <span className={staff.exceptionCount > 0 ? styles.chipWarning : styles.chipGood}>{staff.statusLabel}</span>
                    <span className={styles.chipNeutral}>{staff.policyName}</span>
                  </div>
                  <div className={styles.teamNumbers}>
                    <strong>{minutesLabel(staff.paidMinutes)} paid</strong>
                    <span>{minutesLabel(staff.mealMinutes)} meal · {staff.exceptionCount} exceptions</span>
                  </div>
                </div>
              ))}
              {model.team.length === 0 ? <p className={styles.mvpNote}>No active staff sessions or current cards requiring review.</p> : null}
            </div>
          </article> : null}
          </div>

          <aside className={styles.sideStack} aria-label="Time attendance review rail">
          {activeView === "manager" && model.permissions.manager ? <article className={styles.reviewRail}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Manager queue</span>
                <h2>Review before payroll</h2>
                <p>Exceptions are held until a manager approves, corrects, or documents the outcome.</p>
              </div>
              <BadgeCheck aria-hidden="true" />
            </div>
            <div className={styles.queueList}>
              {model.managerQueue.map((item) => (
                <div className={styles.queueItem} key={item.label}>
                  <div>
                    <h3>{item.label}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <span className={`${styles.queueCount} ${chipClass(item.tone)}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </article> : null}

          {activeView === "policies" ? <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Policy profiles</span>
                <h2>Staff-specific rules</h2>
                <p>Different staff can carry different meal policies when assigned intentionally.</p>
              </div>
              <CalendarClock aria-hidden="true" />
            </div>
            <div className={styles.policyList}>
              {model.policies.map((policy) => (
                <div className={styles.policyCard} key={policy.id}>
                  <div>
                    <h3>{policy.name}</h3>
                    <p>{policy.description}</p>
                  </div>
                  <div className={styles.queueMeta}>
                    <span className={policy.scheduledMealPolicy.paid ? styles.chipGood : styles.chipNeutral}>
                      {policy.scheduledMealPolicy.expectedMealMinutes} min {policy.scheduledMealPolicy.paid ? "paid" : "unpaid"} meal
                    </span>
                  </div>
                </div>
              ))}
              {model.policies.length === 0 ? <p className={styles.mvpNote}>No governed policy profile is assigned or available for your role.</p> : null}
            </div>
          </article> : null}

          {isEmployeeView && model.exceptions.length > 0 ? <article className={styles.panel} id="exceptions">
            <div className={styles.panelHeader}>
              <div>
                <h2>Exceptions to review</h2>
              </div>
              <AlertTriangle aria-hidden="true" />
            </div>
            <div className={styles.exceptionList}>
              {model.exceptions.map((exception, index) => (
                <div className={styles.exceptionChecklistRow} key={`${exception.code}-${index}`}>
                  <div>
                    <strong>{exception.code.toLowerCase().replaceAll("_", " ")}</strong>
                    <p>{exception.message}</p>
                  </div>
                  <em className={exception.blocking ? styles.chipDanger : styles.chipWarning}>{exception.blocking ? "Manager review required" : "Review"}</em>
                </div>
              ))}
            </div>
          </article> : null}

          <TimeAttendanceInboxDrawer notifications={model.notifications} />

          </aside>
        </div>
    </section>
  );
}
