"use client";

import { AlertTriangle, FileWarning, ShieldAlert, UserRoundCheck, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState("");
  const [bulkMessage, setBulkMessage] = useState<{ text: string; tone: "good" | "danger" } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [auditItemId, setAuditItemId] = useState<string | null>(null);
  const auditButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cleanApprovalItems = useMemo(() => queue.items.filter((item) =>
    item.category === "CARD_APPROVAL" && item.severity === "info" && item.cardChecksum && typeof item.timeCardVersion === "number"
  ), [queue.items]);
  const auditItem = auditItemId ? queue.items.find((item) => item.id === auditItemId) ?? null : null;

  const closeAuditDrawer = useCallback(() => {
    const sourceId = auditItemId;
    setAuditItemId(null);
    window.setTimeout(() => {
      if (sourceId) auditButtonRefs.current[sourceId]?.focus();
    }, 0);
  }, [auditItemId]);

  useEffect(() => {
    if (!auditItemId) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeAuditDrawer();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [auditItemId, closeAuditDrawer]);

  function stateFor(id: string) {
    return decisions[id] ?? defaultDecisionState;
  }

  function updateDecision(id: string, patch: Partial<DecisionState>) {
    setDecisions((current) => ({
      ...current,
      [id]: { ...defaultDecisionState, ...current[id], ...patch }
    }));
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllCleanCards() {
    setSelectedIds((current) => current.size === cleanApprovalItems.length
      ? new Set()
      : new Set(cleanApprovalItems.map((item) => item.id)));
  }

  async function submitBulkApproval() {
    setBulkBusy(true);
    setBulkMessage(null);
    try {
      const response = await fetch("/api/time-attendance/manager-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "BULK_APPROVE_CLEAN",
          reason: bulkReason,
          timeCardIds: Array.from(selectedIds)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Bulk approval failed.");
      }
      setBulkMessage({ text: `${payload.approved ?? 0} clean card${payload.approved === 1 ? "" : "s"} approved.`, tone: "good" });
      setSelectedIds(new Set());
      setBulkReason("");
    } catch (error) {
      setBulkMessage({ text: error instanceof Error ? error.message : "Bulk approval failed.", tone: "danger" });
    } finally {
      setBulkBusy(false);
    }
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
    <article className={styles.panel} id="manager-review">
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

      {cleanApprovalItems.length ? (
        <div className={styles.bulkReviewBar} aria-label="Bulk review controls">
          <div>
            <span className={styles.sectionEyebrow}>Bulk approval</span>
            <strong>{selectedIds.size} of {cleanApprovalItems.length} clean cards selected</strong>
            <p>Only attested cards with no blocking exceptions or open corrections can be bulk approved.</p>
          </div>
          <button disabled={bulkBusy} onClick={toggleAllCleanCards} type="button">
            {selectedIds.size === cleanApprovalItems.length ? "Clear selected" : "Select clean cards"}
          </button>
          <input
            aria-label="Bulk approval reason"
            disabled={bulkBusy}
            onChange={(event) => setBulkReason(event.target.value)}
            placeholder="Bulk approval reason"
            value={bulkReason}
          />
          <button
            disabled={bulkBusy || selectedIds.size === 0 || bulkReason.trim().length < 15}
            onClick={() => void submitBulkApproval()}
            type="button"
          >
            Approve selected
          </button>
          {bulkMessage ? <p className={bulkMessage.tone === "good" ? styles.inlineSuccess : styles.inlineError}>{bulkMessage.text}</p> : null}
        </div>
      ) : null}

      <div className={styles.managerReviewTable}>
        {queue.items.length ? (
          <div className={styles.managerReviewTableHeader} aria-hidden="true">
            <span>Staff</span>
            <span>Issue</span>
            <span>Severity</span>
            <span>Age</span>
            <span>Action</span>
          </div>
        ) : null}
        {queue.unavailableReason ? (
          <div className={styles.managerReviewEmpty}>
            <AlertTriangle size={20} aria-hidden="true" />
            <strong>Manager queue temporarily unavailable.</strong>
            <p>The review queue needs the live Time & Attendance tables before it can show persisted exceptions. No review decision has been changed.</p>
          </div>
        ) : queue.items.length ? queue.items.map((item) => (
          ["CORRECTION_REQUEST", "CARD_APPROVAL", "TIME_OFF_REQUEST"].includes(item.category) ? (
            <div className={`${styles.managerReviewTableRow} ${severityClass(item.severity)}`} key={`${item.category}-${item.id}`}>
              <div className={styles.managerReviewPerson}>
                {cleanApprovalItems.some((cleanItem) => cleanItem.id === item.id) ? (
                  <input
                    aria-label={`Select ${item.title} for bulk approval`}
                    checked={selectedIds.has(item.id)}
                    disabled={bulkBusy}
                    onChange={() => toggleSelected(item.id)}
                    type="checkbox"
                  />
                ) : null}
                <span className={styles.managerReviewIcon}>{categoryIcon(item.category)}</span>
                <div>
                  <strong>{item.staffName}</strong>
                  <small>{item.status}</small>
                </div>
              </div>
              <div className={styles.managerReviewIssue}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span className={item.severity === "danger" ? styles.chipDanger : item.severity === "warning" ? styles.chipWarning : styles.chipNeutral}>
                {item.severity}
              </span>
              <strong className={styles.managerReviewAge}>{item.ageLabel}</strong>
              <div className={styles.managerReviewAction}>
                <button
                  className={styles.auditAction}
                  onClick={() => setAuditItemId(item.id)}
                  ref={(node) => {
                    auditButtonRefs.current[item.id] = node;
                  }}
                  type="button"
                >
                  Audit
                </button>
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
              </div>
            </div>
          ) : (
            <div className={`${styles.managerReviewTableRow} ${severityClass(item.severity)}`} key={`${item.category}-${item.id}`}>
              <div className={styles.managerReviewPerson}>
                <span className={styles.managerReviewIcon}>{categoryIcon(item.category)}</span>
                <div>
                  <strong>{item.staffName}</strong>
                  <small>{item.status}</small>
                </div>
              </div>
              <div className={styles.managerReviewIssue}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span className={item.severity === "danger" ? styles.chipDanger : item.severity === "warning" ? styles.chipWarning : styles.chipNeutral}>
                {item.severity}
              </span>
              <strong className={styles.managerReviewAge}>{item.ageLabel}</strong>
              <div className={styles.managerReviewActionCompact}>
                <button
                  className={styles.auditAction}
                  onClick={() => setAuditItemId(item.id)}
                  ref={(node) => {
                    auditButtonRefs.current[item.id] = node;
                  }}
                  type="button"
                >
                  Audit
                </button>
                <Link className={styles.managerReviewOpen} href={item.href}>Open</Link>
              </div>
            </div>
          )
        )) : (
          <div className={styles.managerReviewEmpty}>
            <UserRoundCheck size={20} aria-hidden="true" />
            <strong>No time cards need manager review.</strong>
            <p>Exceptions, correction requests, and disputes will appear here before payroll handoff.</p>
          </div>
        )}
      </div>

      {auditItem ? (
        <aside className={styles.auditDrawer} aria-label="Review evidence drawer">
          <div className={styles.auditDrawerHeader}>
            <div>
              <span className={styles.sectionEyebrow}>Audit evidence</span>
              <h3>{auditItem.title}</h3>
            </div>
            <button aria-label="Close audit drawer" onClick={closeAuditDrawer} type="button">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <dl className={styles.auditFacts}>
            <div><dt>Staff</dt><dd>{auditItem.staffName}</dd></div>
            <div><dt>Status</dt><dd>{auditItem.status}</dd></div>
            <div><dt>Age</dt><dd>{auditItem.ageLabel}</dd></div>
            <div><dt>Severity</dt><dd>{auditItem.severity}</dd></div>
            {typeof auditItem.timeCardVersion === "number" ? <div><dt>Card version</dt><dd>v{auditItem.timeCardVersion}</dd></div> : null}
            {auditItem.cardChecksum ? <div><dt>Checksum</dt><dd>{auditItem.cardChecksum}</dd></div> : null}
          </dl>
          <p>{auditItem.detail}</p>
          <Link className={styles.ghostAction} href={auditItem.href}>Open source record</Link>
        </aside>
      ) : null}
    </article>
  );
}
