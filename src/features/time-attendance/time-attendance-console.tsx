import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
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

export function TimeAttendanceConsole({ activeView, captureState, density, managerReviewQueue, model, payrollReadiness, hardeningReadiness }: TimeAttendanceConsoleProps) {
  return (
    <section className={`${styles.console} ${density === "high" ? styles.consoleHighVolume : ""}`} aria-label="Time and Attendance CCC console">
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>My governed workspace · Time & Attendance</span>
          <h1>Record time. Resolve the next issue. Keep payroll evidence clear.</h1>
          <p>
            Exact punches remain immutable. Cards, reviews, and handoff actions use live persisted records
            and stay separated by role.
          </p>
          <div className={styles.chips} aria-label="Console readiness">
            <span className={styles.chipGood}><ShieldCheck size={14} /> Governed policy controls</span>
            <span className={styles.chip}><TimerReset size={14} /> Exact-time policy</span>
            <span className={styles.chipWarning}><AlertTriangle size={14} /> Review before payroll</span>
          </div>
        </div>
        <div className={styles.heroMetrics}>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryAction} href="/command-center">Return to My Workspace</Link>
            <Link className={styles.primaryAction} href={model.nextAction.href}><FileCheck2 size={16} /> {model.nextAction.label}</Link>
          </div>
          <div className={styles.heroMetric}>
            <span>Current reviewer</span>
            <strong>{model.currentUserName}</strong>
          </div>
          <div className={styles.heroMetric}>
            <span>As of</span>
            <strong>{model.asOfLabel}</strong>
            <small>{model.sourceLabel}</small>
          </div>
        </div>
      </header>

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

      <article className={styles.panel} aria-label="Recommended next action">
        <div className={styles.panelHeader}>
          <div><span className={styles.sectionEyebrow}>Recommended next action</span><h2>{model.nextAction.label}</h2><p>{model.nextAction.detail}</p></div>
          <Link className={styles.ghostAction} href={model.nextAction.href}>Open</Link>
        </div>
      </article>

      <div className={styles.metricGrid} aria-label="Time card totals">
        <div className={styles.metric}><span>Paid time</span><strong>{model.headline.paidHours}</strong></div>
        <div className={styles.metric}><span>Regular</span><strong>{model.headline.regularHours}</strong></div>
        <div className={styles.metric}><span>Overtime</span><strong>{model.headline.overtimeHours}</strong></div>
        <div className={styles.metric}><span>ESST accrued</span><strong>{model.headline.esstAccrued}</strong></div>
      </div>

      <div className={styles.bodyGrid}>
        <div className={styles.mainStack}>
          {activeView === "policies" ? <PolicyAdministrationPanel /> : null}
          {activeView === "today" || activeView === "my-time" ? <TimeAttendanceCapturePanel initialState={captureState} /> : null}

          {activeView === "today" || activeView === "my-time" ? <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>My time card</span>
                <h2>Current pay-period card</h2>
                <p>{model.employeeCard.shiftLabel} · {model.employeeCard.policyLabel}</p>
              </div>
              <span className={model.employeeCard.payrollReady ? styles.chipGood : styles.chipWarning}>
                {model.employeeCard.statusLabel}
              </span>
            </div>
            <div className={styles.timeSummary}>
              <div><span>Total span</span><strong>{minutesLabel(model.employeeCard.attendanceMinutes)}</strong></div>
              <div><span>Meal time</span><strong>{minutesLabel(model.employeeCard.mealMinutes)}</strong></div>
              <div><span>Paid time</span><strong>{minutesLabel(model.employeeCard.paidMinutes)}</strong></div>
            </div>
          </article> : null}

          {activeView === "my-time" ? <TimeCardCorrectionPanel /> : null}

          {activeView === "my-time" && model.corrections.length ? <article className={styles.panel}>
            <div className={styles.panelHeader}><div><span className={styles.sectionEyebrow}>Correction history</span><h2>Requests and decisions</h2><p>Original punches remain unchanged; approved adjustments create new evidence.</p></div></div>
            <div className={styles.timeline}>{model.corrections.map((request) => <div className={styles.timelineItem} key={request.id}><div className={styles.timelineLeft}><span className={styles.dotNeutral} aria-hidden="true" /><div><strong>{request.changeType}</strong><p>{request.managerReason ?? "Awaiting a documented decision."}</p></div></div><span className={styles.timelineTime}>{request.statusLabel}</span></div>)}</div>
          </article> : null}

          {activeView === "my-time" ? <TimeCardAttestationPanel card={model.employeeCard} /> : null}

          {activeView === "my-time" ? <TimeOffRequestPanel /> : null}

          {activeView === "manager" ? <TimeAttendanceManagerReviewPanel queue={managerReviewQueue} /> : null}

          {activeView === "payroll" ? <PayrollHandoffPanel initialReadiness={payrollReadiness} /> : null}

          {activeView === "payroll" ? <HardeningPilotPanel readiness={hardeningReadiness} /> : null}

          {activeView === "manager" || activeView === "payroll" ? <OperationalHealthPanel /> : null}

          {activeView === "today" || activeView === "my-time" ? <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Punch timeline</span>
                <h2>Exact events with policy interpretation</h2>
                <p>Recorded times remain exact. Any adjustment must be a documented correction.</p>
              </div>
              <Clock3 aria-hidden="true" />
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
          </article> : null}

          {activeView === "manager" ? <article className={styles.teamPanel}>
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
                <div className={styles.exceptionRow} key={`${exception.code}-${index}`}>
                  <div>
                    <strong>{exception.code.replaceAll("_", " ")}</strong>
                    <p>{exception.message}</p>
                  </div>
                  <span className={exception.blocking ? styles.chipDanger : styles.chipWarning}>
                    {exception.blocking ? "Blocks payroll" : "Review"}
                  </span>
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

          {model.notifications.length ? <article className={styles.panel}>
            <div className={styles.panelHeader}><div><span className={styles.sectionEyebrow}>Internal inbox</span><h2>Time & Attendance notices</h2><p>Recorded in the workspace only; no email or text delivery is claimed.</p></div></div>
            <div className={styles.exceptionList}>{model.notifications.map((notice) => <div className={styles.exceptionRow} key={notice.id}><div><strong>{notice.title}</strong><p>{notice.body}</p></div><span className={notice.severity === "CRITICAL" ? styles.chipDanger : notice.unread ? styles.chipWarning : styles.chipNeutral}>{notice.unread ? "Unread" : "Read"}</span></div>)}</div>
          </article> : null}

          <p className={styles.mvpNote}>
            Live source generated {new Date(model.generatedAt).toLocaleString()}. Pilot and production eligibility remain blocked until required external reviews and evidence are supplied.
          </p>
        </aside>
      </div>
    </section>
  );
}
