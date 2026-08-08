"use client";

import { AlertTriangle, FileWarning, ShieldAlert, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { TimeAttendanceManagerReviewQueue } from "@/server/time-attendance/manager-review";

import styles from "./time-attendance-console.module.css";

type TimeAttendanceManagerReviewPanelProps = {
  queue: TimeAttendanceManagerReviewQueue;
};

type ManagerDecision = "APPROVE" | "RETURN" | "DENY" | "APPLY" | "APPROVE_COVERAGE";

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

  async function submitDecision(item: TimeAttendanceManagerReviewQueue["items"][number]) {
    const current = stateFor(item.id);
    updateDecision(item.id, { busy: true, message: null, tone: null });
    try {
      const endpoint = item.category === "CARD_APPROVAL"
        ? "/api/time-attendance/manager-cards"
        : item.category === "TIME_OFF_REQUEST"
          ? "/api/time-attendance/time-off-decisions"
          : "/api/time-attendance/manager-corrections";
      const body = item.category === "CARD_APPROVAL"
        ? {
            decision: current.decision === "RETURN" ? "RETURN" : "APPROVE",
            reason: current.reason,
            timeCardId: item.id,
            timeCardVersion: item.timeCardVersion,
            cardChecksum: item.cardChecksum
          }
        : item.category === "TIME_OFF_REQUEST"
          ? { decision: current.decision, reason: current.reason, requestId: item.id }
          : {
              decision: current.decision,
              idempotencyKey: `manager-correction-${item.id}-${current.decision}-${Date.now()}`,
              managerReason: current.reason,
              requestId: item.id
            };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Manager decision failed.");
      }
      updateDecision(item.id, {
        busy: false,
        message: `Decision recorded: ${payload.request?.status ?? payload.card?.status ?? current.decision}.`,
        reason: "",
        tone: "good"
      });
    } catch (error) {
      updateDecision(item.id, {
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
          <p>Review exact card versions, correction evidence, disputes, and leave decisions with a required reason and preserved history.</p>
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
          ["CORRECTION_REQUEST", "CARD_APPROVAL", "TIME_OFF_REQUEST"].includes(item.category) ? (
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
                    {item.category === "CARD_APPROVAL" ? <>
                      <option value="APPROVE">Approve exact card version</option>
                      <option value="RETURN">Return to employee</option>
                    </> : item.category === "TIME_OFF_REQUEST" ? <>
                      <option value="APPROVE_COVERAGE">Approve coverage (ordinary request)</option>
                      <option value="APPROVE">Final approve (leave admin)</option>
                      <option value="RETURN">Return for review</option>
                      <option value="DENY">Deny (leave admin)</option>
                    </> : <>
                      <option value="APPROVE">Approve request</option>
                      <option value="RETURN">Return for more info</option>
                      <option value="DENY">Deny request</option>
                      <option value="APPLY">Apply approved correction</option>
                    </>}
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
                    onClick={() => void submitDecision(item)}
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
