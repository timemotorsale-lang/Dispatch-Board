import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Gauge,
  ShieldCheck,
  TimerReset,
  UsersRound
} from "lucide-react";
import Link from "next/link";

import type { TimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";
import type { TimeAttendanceCaptureState } from "@/server/time-attendance/capture-state";
import type { TimeAttendanceHardeningPilotReadiness } from "@/server/time-attendance/hardening-pilot-service";
import type { TimeAttendanceManagerReviewQueue } from "@/server/time-attendance/manager-review";
import type { PayrollHandoffReadiness } from "@/server/time-attendance/payroll-handoff-service";

import { HardeningPilotPanel } from "./hardening-pilot-panel";
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
import styles from "./time-attendance-console.module.css";

type TimeAttendanceConsoleProps = {
  activeView: "today" | "my-time" | "manager" | "policies" | "payroll";
  captureState: TimeAttendanceCaptureState;
  managerReviewQueue: TimeAttendanceManagerReviewQueue;
  model: TimeAttendanceConsoleModel;
  payrollReadiness: PayrollHandoffReadiness;
  hardeningReadiness: TimeAttendanceHardeningPilotReadiness;
  density: "calm" | "high";
  workspaceHref: string;
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

export function TimeAttendanceConsole({ activeView, captureState, density, managerReviewQueue, model, payrollReadiness, hardeningReadiness, workspaceHref }: TimeAttendanceConsoleProps) {
  const isEmployeeView = activeView === "today" || activeView === "my-time";
  const needsClockIn = captureState.state === "NONE" && captureState.allowedActions.includes("CLOCK_IN");
  const primaryException = model.exceptions[0] ?? null;
  const blockingExceptionCount = model.exceptions.filter((exception) => exception.blocking).length;
  const cardReadiness = !model.employeeCard.available
    ? { detail: "A live card has not been created for this period yet.", label: "Awaiting live card", tone: styles.chipWarning }
    : blockingExceptionCount > 0
      ? { detail: `${blockingExceptionCount} blocking issue${blockingExceptionCount === 1 ? "" : "s"} must be cleared before payroll handoff.`, label: "Blocked before payroll", tone: styles.chipDanger }
      : model.exceptions.length > 0
        ? { detail: `${model.exceptions.length} issue${model.exceptions.length === 1 ? "" : "s"} need review before the card is clean.`, label: "Needs review", tone: styles.chipWarning }
        : model.employeeCard.payrollReady
          ? { detail: "No open exceptions are recorded for this card version.", label: "Ready for payroll", tone: styles.chipGood }
          : { detail: "Review and attestation are still required before payroll handoff.", label: "Review required", tone: styles.chipWarning };
  const quickStats = [
    { label: "Paid time", value: model.headline.paidHours },
    { label: "Regular", value: model.headline.regularHours },
    { label: "Overtime", value: model.headline.overtimeHours },
    { label: "ESST", value: model.headline.esstAccrued }
  ];
  const workflowLinks = [
    { href: "#command-summary", label: "Now" },
    ...(isEmployeeView ? [
      { href: "#capture-actions", label: "Actions" },
      { href: "#time-card-summary", label: "Time card" },
      { href: "#exceptions", label: "Exceptions" },
      { href: "#punch-timeline", label: "Evidence" }
    ] : []),
    ...(activeView === "my-time" ? [
      { href: "#correction-request", label: "Requests" },
      { href: "#card-attestation", label: "Attest" }
    ] : []),
    ...(activeView === "manager" ? [
      { href: "#manager-review", label: "Review" },
      { href: "#team-status", label: "Team" }
    ] : []),
    ...(activeView === "payroll" ? [
      { href: "#payroll-handoff", label: "Payroll" },
      { href: "#operational-health", label: "Health" }
    ] : [])
  ];
  const commandItems: TimeAttendanceCommandItem[] = [
    { detail: model.nextAction.detail, href: model.nextAction.href, label: model.nextAction.label, scope: "Next action" },
    ...workflowLinks.map((link) => ({
      detail: "Jump to this section",
      href: link.href,
      label: link.label,
      scope: "Page"
    })),
    ...model.exceptions.map((exception) => ({
      detail: exception.message,
      href: "#exceptions",
      label: exception.code.replaceAll("_", " "),
      scope: exception.blocking ? "Payroll blocker" : "Exception"
    })),
    ...model.team.slice(0, 8).map((staff) => ({
      detail: `${staff.statusLabel} · ${minutesLabel(staff.paidMinutes)} paid`,
      href: "#team-status",
      label: staff.name,
      scope: "Staff"
    })),
    ...managerReviewQueue.items.slice(0, 8).map((item) => ({
      detail: `${item.staffName} · ${item.status} · ${item.ageLabel}`,
      href: "#manager-review",
      label: item.title,
      scope: "Manager queue"
    }))
  ];

  return (
    <section className={`${styles.console} ${density === "high" ? styles.consoleHighVolume : ""}`} aria-label="Time and Attendance CCC console">
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Protected start · Time Card</span>
          <h1>{needsClockIn ? "Clock in first" : "Time card is active"}</h1>
          <p>
            {needsClockIn
              ? "Start your shift here, then continue to your assigned workspace with a clean time record."
              : "Your time status is visible here. Continue to your workspace when you are ready to work."}
          </p>
          <div className={styles.chips} aria-label="Console readiness">
            <span className={styles.chipGood}><ShieldCheck size={14} /> Governed policy controls</span>
            <span className={styles.chip}><TimerReset size={14} /> Exact-time policy</span>
            <span className={styles.chipWarning}><AlertTriangle size={14} /> Review before payroll</span>
          </div>
        </div>
        <div className={styles.heroCompactMeta}>
          <span>{model.currentUserName}</span>
          <span>{model.asOfLabel}</span>
          <Link className={needsClockIn ? styles.secondaryActionMuted : styles.secondaryAction} href={workspaceHref}>{needsClockIn ? "Go to workspace" : "Go to my workspace"}</Link>
        </div>
      </header>

      <section className={styles.startGate} aria-label="Time card start checkpoint">
        <div>
          <span className={styles.sectionEyebrow}>Login checkpoint</span>
          <h2>{needsClockIn ? "Clock in before starting work" : captureState.statusLabel}</h2>
          <p>{needsClockIn ? "The clock-in control is the first action below. The workspace link stays available for exceptions, but the intended path is clock in first." : "You can continue to your assigned workspace while your time card remains available for meals, breaks, and clock out."}</p>
        </div>
        <Link className={needsClockIn ? styles.ghostAction : styles.primaryActionDark} href={workspaceHref}>{needsClockIn ? "Continue to workspace" : "Go to my workspace"}</Link>
      </section>

      <nav className={styles.tabs} aria-label="Time and attendance workspaces">
        <Link aria-current={activeView === "today" ? "page" : undefined} className={activeView === "today" ? styles.tabActive : styles.tab} href="/time-attendance?view=today">Today</Link>
        <Link aria-current={activeView === "my-time" ? "page" : undefined} className={activeView === "my-time" ? styles.tabActive : styles.tab} href="/time-attendance?view=my-time">My Time</Link>
        {model.permissions.manager ? <Link aria-current={activeView === "manager" ? "page" : undefined} className={activeView === "manager" ? styles.tabActive : styles.tab} href="/time-attendance?view=manager">Manager Review</Link> : null}
        {model.permissions.policies ? <Link aria-current={activeView === "policies" ? "page" : undefined} className={activeView === "policies" ? styles.tabActive : styles.tab} href="/time-attendance?view=policies">Policies</Link> : null}
        {model.permissions.payroll ? <Link aria-current={activeView === "payroll" ? "page" : undefined} className={activeView === "payroll" ? styles.tabActive : styles.tab} href="/time-attendance?view=payroll">Payroll Handoff</Link> : null}
      </nav>

      {model.dataState === "UNAVAILABLE" ? (
        <div className={styles.captureError} role="alert"><AlertTriangle size={16} />Live card data is unavailable: {model.unavailableReason}. Punch capture reports its availability separately.</div>
      ) : null}

      {isEmployeeView ? <div id="capture-actions"><TimeAttendanceCapturePanel initialState={captureState} /></div> : null}

      <TimeAttendanceCommandBar items={commandItems} />

      <section className={styles.commandPanel} id="command-summary" aria-label="Time card command summary">
        <div className={styles.commandCopy}>
          <span className={styles.sectionEyebrow}>Next best action</span>
          <h2>{model.nextAction.label}</h2>
          <p>{model.nextAction.detail}</p>
          {primaryException ? (
            <span className={primaryException.blocking ? styles.chipDanger : styles.chipWarning}>
              {primaryException.blocking ? "Payroll blocker" : "Needs review"}
            </span>
          ) : (
            <span className={styles.chipGood}>No open exception</span>
          )}
        </div>
        <div className={styles.commandActions}>
          <Link className={styles.primaryActionDark} href={model.nextAction.href}><FileCheck2 size={16} /> Open next action</Link>
          <Link className={styles.ghostAction} href="/time-attendance?view=my-time">Review my card</Link>
        </div>
        <dl className={styles.commandMetrics}>
          {quickStats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav className={styles.mobileJumpRail} aria-label="Jump to time card section">
        <span>Jump to</span>
        {workflowLinks.map((link) => <a href={link.href} key={link.href}>{link.label}</a>)}
      </nav>

      <div className={styles.workspaceGrid}>
        <nav className={styles.workflowRail} aria-label="Time card workflow">
          <span>Workflow</span>
          {workflowLinks.map((link) => <a href={link.href} key={link.href}>{link.label}</a>)}
        </nav>

        <div className={styles.bodyGrid}>
          <div className={styles.mainStack}>
          {activeView === "policies" ? <PolicyAdministrationPanel /> : null}

          {isEmployeeView ? <article className={styles.panel} id="time-card-summary">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>My time card</span>
                <h2>{cardReadiness.label}</h2>
                <p>{cardReadiness.detail}</p>
              </div>
              <span className={cardReadiness.tone}>{model.employeeCard.statusLabel}</span>
            </div>
            <div className={styles.cardContextLine}>
              <span>{model.employeeCard.shiftLabel}</span>
              <span>{model.employeeCard.policyLabel}</span>
              <span>Version {model.employeeCard.timeCardVersion}</span>
            </div>
            <div className={styles.timeSummary}>
              <div><span>Total span</span><strong>{minutesLabel(model.employeeCard.attendanceMinutes)}</strong></div>
              <div><span>Meal time</span><strong>{minutesLabel(model.employeeCard.mealMinutes)}</strong></div>
              <div><span>Paid time</span><strong>{minutesLabel(model.employeeCard.paidMinutes)}</strong></div>
            </div>
            <div className={styles.cardExecutionRow}>
              <Link className={styles.ghostAction} href="#punch-timeline"><Clock3 size={15} /> View punch trail</Link>
              <Link className={styles.ghostAction} href="/time-attendance?view=my-time#correction-request">Request correction</Link>
              <Link className={styles.ghostAction} href="/time-attendance?view=my-time#card-attestation">Confirm card</Link>
            </div>
          </article> : null}

          {activeView === "my-time" ? (
            <details className={styles.workflowDisclosure} id="correction-request">
              <summary><span>Request correction</span><small>Create a manager-reviewed change without altering original punches.</small></summary>
              <TimeCardCorrectionPanel />
            </details>
          ) : null}

          {activeView === "my-time" && model.corrections.length ? (
            <details className={styles.workflowDisclosure}>
              <summary><span>Correction history</span><small>Review submitted requests and documented decisions.</small></summary>
              <article className={styles.panel}>
                <div className={styles.panelHeader}><div><span className={styles.sectionEyebrow}>Correction history</span><h2>Requests and decisions</h2><p>Original punches remain unchanged; approved adjustments create new evidence.</p></div></div>
                <div className={styles.timeline}>{model.corrections.map((request) => <div className={styles.timelineItem} key={request.id}><div className={styles.timelineLeft}><span className={styles.dotNeutral} aria-hidden="true" /><div><strong>{request.changeType}</strong><p>{request.managerReason ?? "Awaiting a documented decision."}</p></div></div><span className={styles.timelineTime}>{request.statusLabel}</span></div>)}</div>
              </article>
            </details>
          ) : null}

          {activeView === "my-time" ? (
            <details className={styles.workflowDisclosure} id="card-attestation">
              <summary><span>Confirm or dispute card</span><small>Bind your review to the current card version and checksum.</small></summary>
              <TimeCardAttestationPanel card={model.employeeCard} />
            </details>
          ) : null}

          {activeView === "my-time" ? (
            <details className={styles.workflowDisclosure}>
              <summary><span>Request time off</span><small>Submit leave requests with manager coverage review.</small></summary>
              <TimeOffRequestPanel />
            </details>
          ) : null}

          {activeView === "manager" ? <TimeAttendanceManagerReviewPanel queue={managerReviewQueue} /> : null}

          {activeView === "payroll" ? <div id="payroll-handoff"><PayrollHandoffPanel initialReadiness={payrollReadiness} /></div> : null}

          {activeView === "payroll" ? <HardeningPilotPanel readiness={hardeningReadiness} /> : null}

          {activeView === "manager" || activeView === "payroll" ? <div id="operational-health"><OperationalHealthPanel /></div> : null}

          {isEmployeeView ? (
            <details className={styles.workflowDisclosure} id="punch-timeline">
              <summary><span>Punch trail and policy interpretation</span><small>Inspect exact events and card calculations.</small></summary>
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

          {activeView === "manager" ? <article className={styles.teamPanel} id="team-status">
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
                <div className={styles.teamRow} key={staff.id}>
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
          {activeView === "manager" ? <article className={styles.reviewRail}>
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

          {activeView === "policies" || activeView === "my-time" ? <article className={styles.panel}>
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

          {activeView === "today" || activeView === "my-time" ? <article className={styles.panel} id="exceptions">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Exceptions</span>
                <h2>What must be reviewed</h2>
                <p>The system does not quietly change payable time. It flags the issue and preserves the record.</p>
              </div>
              <AlertTriangle aria-hidden="true" />
            </div>
            <div className={styles.exceptionList}>
              {model.exceptions.length > 0 ? model.exceptions.map((exception, index) => (
                <div className={styles.exceptionChecklistRow} key={`${exception.code}-${index}`}>
                  <div><span>Issue</span><strong>{exception.code.replaceAll("_", " ")}</strong><p>{exception.message}</p></div>
                  <div><span>Owner</span><strong>{exception.blocking ? "Manager" : "Employee / manager"}</strong></div>
                  <div><span>Required action</span><strong>{exception.blocking ? "Resolve before payroll" : "Review and document"}</strong></div>
                  <div><span>Status</span><em className={exception.blocking ? styles.chipDanger : styles.chipWarning}>{exception.blocking ? "Blocks payroll" : "Review"}</em></div>
                </div>
              )) : (
                <div className={styles.exceptionRow}>
                  <div>
                    <strong>No exceptions</strong>
                    <p>{model.employeeCard.available ? "No open exceptions are recorded for this card version." : "No card exists yet; this is not a payroll-readiness statement."}</p>
                  </div>
                  <CheckCircle2 aria-hidden="true" />
                </div>
              )}
            </div>
          </article> : null}

          <TimeAttendanceInboxDrawer notifications={model.notifications} />

          <p className={styles.mvpNote}>
            Live source generated {new Date(model.generatedAt).toLocaleString()}. Pilot and production eligibility remain blocked until required external reviews and evidence are supplied.
          </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
