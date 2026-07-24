import { AlertTriangle, FileWarning, ShieldAlert, UserRoundCheck } from "lucide-react";
import Link from "next/link";

import type { TimeAttendanceManagerReviewQueue } from "@/server/time-attendance/manager-review";

import styles from "./time-attendance-console.module.css";

type TimeAttendanceManagerReviewPanelProps = {
  queue: TimeAttendanceManagerReviewQueue;
};

function severityClass(severity: "info" | "warning" | "danger") {
  if (severity === "danger") return styles.managerReviewDanger;
  if (severity === "warning") return styles.managerReviewWarning;
  return styles.managerReviewInfo;
}

function categoryIcon(category: string) {
  if (category === "CARD_EXCEPTION") return <ShieldAlert size={17} aria-hidden="true" />;
  if (category === "ATTESTATION_DISPUTE") return <AlertTriangle size={17} aria-hidden="true" />;
  return <FileWarning size={17} aria-hidden="true" />;
}

export function TimeAttendanceManagerReviewPanel({ queue }: TimeAttendanceManagerReviewPanelProps) {
  if (!queue.permitted) {
    return (
      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Manager review</span>
            <h2>Manager queue is protected</h2>
            <p>Managers can review payroll-blocking exceptions, disputes, and correction requests here.</p>
          </div>
          <span className={styles.chipNeutral}>Manager only</span>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Exception-first manager console</span>
          <h2>Time cards needing review</h2>
          <p>Read-only TA-033 queue. Decisions, corrections, and approvals are handled in TA-034.</p>
        </div>
        <span className={queue.totals.blocking > 0 ? styles.chipDanger : styles.chipGood}>
          {queue.totals.blocking} blocking
        </span>
      </div>

      <div className={styles.managerReviewMetrics}>
        <div><span>All items</span><strong>{queue.totals.all}</strong></div>
        <div><span>Exceptions</span><strong>{queue.totals.exceptions}</strong></div>
        <div><span>Corrections</span><strong>{queue.totals.corrections}</strong></div>
        <div><span>Disputes</span><strong>{queue.totals.disputes}</strong></div>
      </div>

      <div className={styles.managerReviewList}>
        {queue.items.length ? queue.items.map((item) => (
          <Link className={`${styles.managerReviewItem} ${severityClass(item.severity)}`} href={item.href} key={`${item.category}-${item.id}`}>
            <span className={styles.managerReviewIcon}>{categoryIcon(item.category)}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.staffName} · {item.status} · age {item.ageLabel}</small>
              <p>{item.detail}</p>
            </span>
          </Link>
        )) : (
          <div className={styles.managerReviewEmpty}>
            <UserRoundCheck size={20} aria-hidden="true" />
            <strong>No time cards need manager review.</strong>
            <p>Exceptions, correction requests, and disputes will appear here before payroll handoff.</p>
          </div>
        )}
      </div>
    </article>
  );
}
