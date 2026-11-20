"use client";

import { AlertTriangle, FileWarning, ShieldAlert, UserRoundCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState("ALL");
  const [decisions, setDecisions] = useState<Record<string, DecisionState>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState("");
  const [bulkMessage, setBulkMessage] = useState<{ text: string; tone: "good" | "danger" } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [decisionNotice, setDecisionNotice] = useState<string | null>(null);
  const [auditItemId, setAuditItemId] = useState<string | null>(null);
  const auditButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visibleItems = useMemo(() => queue.items.filter(item =>
    (reviewFilter === "ALL" || (reviewFilter === "BLOCKING" ? item.severity === "danger" : item.category === reviewFilter)) &&
    `${item.staffName} ${item.title} ${item.status}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [queue.items, reviewFilter, search]);
  const cleanApprovalItems = useMemo(() => visibleItems.filter((item) =>
    item.category === "CARD_APPROVAL" && item.severity === "info" && item.cardChecksum && typeof item.timeCardVersion === "number"
  ), [visibleItems]);
  const approvedSelection = cleanApprovalItems.filter(item => selectedIds.has(item.id));
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

  function decisionFor(item: TimeAttendanceManagerReviewQueue["items"][number]): ManagerDecision {
    const decision = stateFor(item.id).decision;
    if (item.timeOffReview && !item.timeOffReview.actions.some(action => action === decision)) return item.timeOffReview.actions[0] ?? "APPROVE";
    if (item.correctionRebuildPending || (item.category === "CORRECTION_REQUEST" && item.status === "Approved · ready to apply" && decision === "APPROVE")) return "APPLY";
    return decision;
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
    setSelectedIds(() => approvedSelection.length === cleanApprovalItems.length
      ? new Set()
      : new Set(cleanApprovalItems.map((item) => item.id)));
  }

  async function submitBulkApproval() {
    if (bulkBusy || !approvedSelection.length) return;
    setBulkBusy(true);
    setBulkMessage(null);
    try {
      const response = await fetch("/api/time-attendance/manager-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "BULK_APPROVE_CLEAN",
          reason: bulkReason,
          timeCardIds: approvedSelection.map(item => item.id)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Bulk approval failed.");
      }
      setBulkMessage({ text: `${payload.approved ?? 0} clean card${payload.approved === 1 ? "" : "s"} approved.`, tone: "good" });
      setSelectedIds(new Set());
      setBulkReason("");
      router.refresh();
    } catch (error) {
      setBulkMessage({ text: `${error instanceof Error ? error.message : "Bulk approval failed."} The queue is refreshing because some approvals may have been recorded.`, tone: "danger" });
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  async function submitDecision(item: TimeAttendanceManagerReviewQueue["items"][number]) {
    const current = stateFor(item.id);
    const decision = decisionFor(item);
    setDecisionNotice(null);
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
          ? { decision, reason: item.timeOffReview?.projectionPending ? "Retry updating the time card from the approved request." : current.reason,
              requestId: item.id, expectedUpdatedAt: item.timeOffReview?.version }
          : {
              decision,
              idempotencyKey: `manager-correction-${item.id}-${decision}-${Date.now()}`,
              managerReason: item.correctionRebuildPending ? "Retry rebuilding the time card from the recorded correction." : current.reason,
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
      const rebuildPending = payload.projection?.state === "BLOCKED";
      updateDecision(item.id, {
        busy: false,
        decision: "APPROVE",
        message: rebuildPending ? payload.projection.reason : `Decision recorded: ${payload.request?.status ?? payload.card?.status ?? current.decision}.`,
        reason: "",
        tone: rebuildPending ? "danger" : "good"
      });
      const status = payload.request?.status === "DRAFT" && decision === "RETURN" ? "Returned for revision" : payload.request?.status ?? payload.card?.status ?? decision;
      setDecisionNotice(`${item.staffName} · ${rebuildPending ? "Card update pending" : status}.`);
      router.refresh();
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
      <div className={styles.reviewFilters}>
        <label>Search review queue <input value={search} onChange={event => { setSearch(event.target.value); setSelectedIds(new Set()); }} placeholder="Staff name, issue, or status" /></label>
        <label>Review queue filter <select value={reviewFilter} onChange={event => { setReviewFilter(event.target.value); setSelectedIds(new Set()); }}>
          <option value="ALL">All review items</option><option value="BLOCKING">Payroll blockers</option>
          <option value="CARD_APPROVAL">Card approvals</option><option value="CORRECTION_REQUEST">Corrections</option>
          <option value="CARD_EXCEPTION">Exceptions</option><option value="ATTESTATION_DISPUTE">Disputes</option><option value="TIME_OFF_REQUEST">Time off</option>
        </select></label>
        <span role="status">{visibleItems.length} shown</span>
      </div>
      {decisionNotice && <p role="status" className={styles.inlineSuccess}>{decisionNotice}</p>}

      {cleanApprovalItems.length ? (
        <div className={styles.bulkReviewBar} aria-label="Bulk review controls">
          <div>
            <span className={styles.sectionEyebrow}>Bulk approval</span>
            <strong>{approvedSelection.length} of {cleanApprovalItems.length} clean cards selected</strong>
            <p>Only attested cards with no blocking exceptions or open corrections can be bulk approved.</p>
          </div>
          <button disabled={bulkBusy} onClick={toggleAllCleanCards} type="button">
            {approvedSelection.length === cleanApprovalItems.length ? "Clear selected" : "Select clean cards"}
          </button>
          <input
            aria-label="Bulk approval reason"
            disabled={bulkBusy}
            onChange={(event) => setBulkReason(event.target.value)}
            placeholder="Bulk approval reason"
            value={bulkReason}
          />
          <button
            disabled={bulkBusy || approvedSelection.length === 0 || bulkReason.trim().length < 15}
            onClick={() => void submitBulkApproval()}
            type="button"
          >
            Approve selected
          </button>
        </div>
      ) : null}
      {bulkMessage && <p role="status" className={bulkMessage.tone === "good" ? styles.inlineSuccess : styles.inlineError}>{bulkMessage.text}</p>}

      <div className={styles.managerReviewTable}>
        {visibleItems.length ? (
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
            <p>Refresh to try again.</p>
          </div>
        ) : visibleItems.length ? visibleItems.map((item) => (
          ["CORRECTION_REQUEST", "CARD_APPROVAL", "TIME_OFF_REQUEST"].includes(item.category) ? (
            <div className={`${styles.managerReviewTableRow} ${severityClass(item.severity)}`} id={`time-review-${item.id}`} key={`${item.category}-${item.id}`}>
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
                {item.timeOffReview && <details>
                  <summary>Review coverage</summary>
                  <ul>{item.timeOffReview.dates.map(date => <li key={date}>{date}</li>)}</ul>
                  <p>{item.timeOffReview.appointmentConflicts === null ? "Coverage data temporarily unavailable." :
                    `${item.timeOffReview.appointmentConflicts} assigned appointments overlap · ${item.timeOffReview.overlappingAbsences} other staff already approved off`}</p>
                  <a href={item.timeOffReview.calendarHref}>Open appointment calendar</a>
                </details>}
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
                {item.timeOffReview?.actions.length === 0 ? <p>Waiting for an authorized reviewer.</p> : <div className={styles.managerDecisionForm}>
                  <select
                    aria-label={`Decision for ${item.title}`}
                    disabled={stateFor(item.id).busy}
                    onChange={(event) => updateDecision(item.id, { decision: event.target.value as ManagerDecision })}
                    value={decisionFor(item)}
                  >
                    {item.category === "CARD_APPROVAL" ? <>
                      <option value="APPROVE">Approve exact card version</option>
                      <option value="RETURN">Return to employee</option>
                    </> : item.category === "TIME_OFF_REQUEST" ? item.timeOffReview?.actions.map(action => <option value={action} key={action}>{
                      action === "APPROVE_COVERAGE" ? "Approve coverage" : action === "APPROVE" ? item.timeOffReview?.projectionPending ? "Retry pay-period update" : "Approve time off" :
                        action === "RETURN" ? "Return to employee for revision" : "Deny time off"
                    }</option>) : <>
                      {item.correctionRebuildPending ? <option value="APPLY">Retry card rebuild</option> : <>
                        {item.status === "Approved · ready to apply" ? <option value="APPLY">Apply approved correction</option> : <option value="APPROVE">Approve request</option>}
                        <option value="RETURN">Return for more info</option>
                        <option value="DENY">Deny request</option>
                      </>}
                    </>}
                  </select>
                  {item.correctionRebuildPending || item.timeOffReview?.projectionPending ? null : <input
                    aria-label={`Reason for ${item.title}`}
                    disabled={stateFor(item.id).busy}
                    onChange={(event) => updateDecision(item.id, { reason: event.target.value })}
                    placeholder="Manager reason required"
                    value={stateFor(item.id).reason}
                  />}
                  <button
                    disabled={stateFor(item.id).busy || (!item.correctionRebuildPending && !item.timeOffReview?.projectionPending && stateFor(item.id).reason.trim().length < 15)}
                    onClick={() => void submitDecision(item)}
                    type="button"
                  >
                    {item.correctionRebuildPending ? "Rebuild card" : item.timeOffReview?.projectionPending ? "Update pay periods" : "Record decision"}
                  </button>
                </div>}
                {stateFor(item.id).message ? (
                  <p className={stateFor(item.id).tone === "good" ? styles.inlineSuccess : styles.inlineError}>
                    {stateFor(item.id).message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={`${styles.managerReviewTableRow} ${severityClass(item.severity)}`} id={`time-review-${item.id}`} key={`${item.category}-${item.id}`}>
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
            <strong>{queue.items.length ? "No review items match these filters." : "No time cards need manager review."}</strong>
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
