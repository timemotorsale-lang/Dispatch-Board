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

import styles from "./time-attendance-console.module.css";

type TimeAttendanceConsoleProps = {
  model: TimeAttendanceConsoleModel;
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

export function TimeAttendanceConsole({ model }: TimeAttendanceConsoleProps) {
  return (
    <section className={styles.console} aria-label="Time and Attendance CCC console">
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>CCC board console · Time & Attendance</span>
          <h1>Time cards that are ready for payroll, review, and legal confidence.</h1>
          <p>
            Start with exact punches, Minnesota and federal rule checks, staff-specific meal policies,
            manager review, and a controlled payroll handoff path.
          </p>
          <div className={styles.chips} aria-label="Console readiness">
            <span className={styles.chipGood}><ShieldCheck size={14} /> MN + federal baseline</span>
            <span className={styles.chip}><TimerReset size={14} /> Exact-time policy</span>
            <span className={styles.chipWarning}><AlertTriangle size={14} /> Review before payroll</span>
          </div>
        </div>
        <div className={styles.heroMetrics}>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryAction} href="/command-center">CCC Home</Link>
            <span className={styles.primaryAction}><FileCheck2 size={16} /> MVP Preview</span>
          </div>
          <div className={styles.heroMetric}>
            <span>Current reviewer</span>
            <strong>{model.currentUserName}</strong>
          </div>
          <div className={styles.heroMetric}>
            <span>As of</span>
            <strong>{model.asOfLabel}</strong>
          </div>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Time and attendance workspaces">
        <span className={styles.tabActive}>Today</span>
        <span className={styles.tab}>My Time</span>
        <span className={styles.tab}>Manager Review</span>
        <span className={styles.tab}>Policies</span>
        <span className={styles.tab}>Payroll Handoff</span>
      </nav>

      <div className={styles.metricGrid} aria-label="Time card totals">
        <div className={styles.metric}><span>Paid time</span><strong>{model.headline.paidHours}</strong></div>
        <div className={styles.metric}><span>Regular</span><strong>{model.headline.regularHours}</strong></div>
        <div className={styles.metric}><span>Overtime</span><strong>{model.headline.overtimeHours}</strong></div>
        <div className={styles.metric}><span>ESST accrued</span><strong>{model.headline.esstAccrued}</strong></div>
      </div>

      <div className={styles.bodyGrid}>
        <div className={styles.mainStack}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>My time card</span>
                <h2>Today’s time card preview</h2>
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
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Punch timeline</span>
                <h2>Exact events with policy interpretation</h2>
                <p>The MVP keeps recorded times exact. Any adjustment must be a documented correction.</p>
              </div>
              <Clock3 aria-hidden="true" />
            </div>
            <div className={styles.timeline}>
              {model.timeline.map((item) => (
                <div className={styles.timelineItem} key={`${item.label}-${item.time}`}>
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
            </div>
          </article>

          <article className={styles.teamPanel}>
            <div className={styles.teamHeader}>
              <div>
                <span className={styles.sectionEyebrow}>CCC team view</span>
                <h2>Staff time status</h2>
                <p>Board-level visibility across staff policies, time status, and review needs.</p>
              </div>
              <UsersRound aria-hidden="true" />
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
            </div>
          </article>
        </div>

        <aside className={styles.sideStack} aria-label="Time attendance review rail">
          <article className={styles.reviewRail}>
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
          </article>

          <article className={styles.panel}>
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
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Exceptions</span>
                <h2>What must be reviewed</h2>
                <p>The system does not quietly change payable time. It flags the issue and preserves the record.</p>
              </div>
              <AlertTriangle aria-hidden="true" />
            </div>
            <div className={styles.exceptionList}>
              {model.exceptions.length > 0 ? model.exceptions.map((exception) => (
                <div className={styles.exceptionRow} key={exception.code}>
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
                    <p>This card is clear for payroll review.</p>
                  </div>
                  <CheckCircle2 aria-hidden="true" />
                </div>
              )}
            </div>
          </article>

          <p className={styles.mvpNote}>
            MVP preview: this first CCC page is wired to the time-attendance rule foundation and sample read model.
            Live punch actions, database-backed team cards, and payroll export approvals come next.
          </p>
        </aside>
      </div>
    </section>
  );
}
