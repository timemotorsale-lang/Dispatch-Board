"use client";

import { AlertTriangle, FileWarning, ShieldAlert, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { TimeAttendanceManagerReviewQueue } from "@/server/time-attendance/manager-review";

import styles from "./time-attendance-console.module.css";

type TimeAttendanceManagerReviewPanelProps = {
  queue: TimeAttendanceManagerReviewQueue;
};

type ManagerDecision = "APPROVE" | "RETURN" | "DENY" | "APPLY";

type DecisionState = {
  busy: boolean;
  decision: ManagerDecision;
  message: string | null;
  reason: string;
  tone: "good" | "danger" | null;
};

const defaultDecisionState: DecisionState = {
  busy: false,
  decision: "APPROVE",
  message: null,
  reason: "",
  tone: null
};

function severityClass(severity: "info" | "warning" | "danger") {
  if (severity === "danger") return styles.managerReviewDanger;
  if (severity === "warning") return styles.managerReviewWarning;
  return styles.managerReviewInfo;
}

function categoryIcon(category: string) {
  if (category === "CARD_EXCEPTION") return <ShieldAlert size={17} aria-hidden="true" />;
  if (category === "ATTESTATION_DISPUTE") return <AlertTriangle size={17} aria-hidden="true" />;
  if (category === "TIME_OFF_REQUEST") return <UserRoundCheck size={17} aria-hidden="true" />;
  return <FileWarning size={17} aria-hidden="true" />;
}

export function TimeAttendanceManagerReviewPanel({ queue }: TimeAttendanceManagerReviewPanelProps) {
  const [decisions, setDecisions] = useState<Record<string, DecisionState>>({});

  function stateFor(id: string) {
    return decisions[id] ?? defaultDecisionState;
  }

  function updateDecision(id: string, patch: Partial<DecisionState>) {
    setDecisions((current) => ({
      ...current,
      [id]: { ...defaultDecisionState, ...current[id], ...patch }
    }));
  }

  async function submitDecision(requestId: string) {
    const current = stateFor(requestId);
    updateDecision(requestId, { busy: true, message: null, tone: null });
    try {
      const response = await fetch("/api/time-attendance/manager-corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: current.decision,
          idempotencyKey: `manager-correction-${requestId}-${current.decision}-${Date.now()}`,
          managerReason: current.reason,
          requestId
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Manager decision failed.");
      }
      updateDecision(requestId, {
        busy: false,
        message: `Decision recorded: ${payload.request?.status ?? current.decision}.`,
        reason: "",
        tone: "good"
      });
    } catch (error) {
      updateDecision(requestId, {
        busy: false,
        message: error instanceof Error ? error.message : "Manager decision failed.",
        tone: "danger"
      });
    }
  }

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
          <p>TA-034 adds manager correction decisions with a required reason and preserved punch trail.</p>
        </div>
        <span className={queue.totals.blocking > 0 ? styles.chipDanger : styles.chipGood}>
          {queue.totals.blocking} blocking
        </span>
      </div>

      <div className={styles.managerReviewMetrics}>
        <div><span>All items</span><strong>{queue.totals.all}</strong></div>
        <div><span>Exceptions</span><strong>{queue.totals.exceptions}</strong></div>
        <div><span>Corrections</span><strong>{queue.totals.corrections}</strong></div>
        <div><span>Time off</span><strong>{queue.totals.timeOff}</strong></div>
      </div>

      <div className={styles.managerReviewList}>
        {queue.unavailableReason ? (
          <div className={styles.managerReviewEmpty}>
            <AlertTriangle size={20} aria-hidden="true" />
            <strong>Manager queue temporarily unavailable.</strong>
            <p>The review queue needs the live Time & Attendance tables before it can show persisted exceptions. No review decision has been changed.</p>
          </div>
        ) : queue.items.length ? queue.items.map((item) => (
          item.category === "CORRECTION_REQUEST" ? (
            <div className={`${styles.managerReviewItem} ${severityClass(item.severity)}`} key={`${item.category}-${item.id}`}>
              <span className={styles.managerReviewIcon}>{categoryIcon(item.category)}</span>
              <span className={styles.managerReviewContent}>
                <strong>{item.title}</strong>
                <small>{item.staffName} · {item.status} · age {item.ageLabel}</small>
                <p>{item.detail}</p>
                <div className={styles.managerDecisionForm}>
                  <select
                    aria-label={`Decision for ${item.title}`}
                    disabled={stateFor(item.id).busy}
                    onChange={(event) => updateDecision(item.id, { decision: event.target.value as ManagerDecision })}
                    value={stateFor(item.id).decision}
                  >
                    <option value="APPROVE">Approve request</option>
                    <option value="RETURN">Return for more info</option>
                    <option value="DENY">Deny request</option>
                    <option value="APPLY">Apply approved correction</option>
                  </select>
                  <input
                    aria-label={`Reason for ${item.title}`}
                    disabled={stateFor(item.id).busy}
                    onChange={(event) => updateDecision(item.id, { reason: event.target.value })}
                    placeholder="Manager reason required"
                    value={stateFor(item.id).reason}
                  />
                  <button
                    disabled={stateFor(item.id).busy || stateFor(item.id).reason.trim().length < 15}
                    onClick={() => void submitDecision(item.id)}
                    type="button"
                  >
                    Record decision
                  </button>
                </div>
                {stateFor(item.id).message ? (
                  <p className={stateFor(item.id).tone === "good" ? styles.inlineSuccess : styles.inlineError}>
                    {stateFor(item.id).message}
                  </p>
                ) : null}
              </span>
            </div>
          ) : (
            <Link className={`${styles.managerReviewItem} ${severityClass(item.severity)}`} href={item.href} key={`${item.category}-${item.id}`}>
              <span className={styles.managerReviewIcon}>{categoryIcon(item.category)}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.staffName} · {item.status} · age {item.ageLabel}</small>
                <p>{item.detail}</p>
              </span>
            </Link>
          )
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
