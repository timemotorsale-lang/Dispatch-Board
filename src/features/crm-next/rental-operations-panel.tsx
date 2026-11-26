"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RENTAL_OPERATIONS_CHANGED, rentalActionHref, rentalActionLabel, rentalOperationsSummary, rentalTime, type RentalOperations, type RentalWork } from "@/lib/rental-operations";
import styles from "./shared-deal-identities.module.css";

const evidenceValue = (value: unknown) => value == null || value === "" || Array.isArray(value) && !value.length ? "Not recorded" : Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? value ? "Verified" : "Not verified" : String(value);
const activityLabels: Record<string, string> = {
  RESERVE: "Checkout scheduled", HANDOFF: "Vehicle checked out", EXTEND: "Due-back extended", RETURN: "Vehicle returned",
  COMPLETE: "Assignment completed", CANCEL: "Reservation cancelled", RENTAL_DRAFT_CANCELLED: "Draft cancelled"
};
type RentalDetailsOptions = NonNullable<Parameters<typeof rentalOperationsSummary>[1]>;
export function RentalOperationsDetails({ model, draftId, pathway = "daily-rental", packetClosed, closedReturns, cancelled, inactive = false, canAct = true }: { model: RentalOperations; draftId: string; pathway?: string; packetClosed: boolean; closedReturns?: RentalDetailsOptions["closedReturns"]; cancelled?: boolean; inactive?: boolean; canAct?: boolean }) {
  const summary = rentalOperationsSummary(model.bookings, { pathway, packetClosed, closedReturns, cancelled, inactive: inactive || !canAct });
  const loaner = pathway === "vehicle-loaner";
  const booking = summary.booking;
  const checkoutNeedsAgreement = summary.stage === "RESERVED" && model.agreements?.length === 0;
  const recoveryActions = inactive && model.canManageExceptions && canAct
    ? summary.active && summary.checkedOutAt ? ["RETURN"] as const : summary.stage === "RETURNED_REVIEW" ? ["COMPLETE"] as const : []
    : summary.actions;
  return <section className={styles.useTool} aria-label="Rental lifecycle operations">
    <h3>{loaner ? "Loaner Operations" : "Daily Rental Operations"}</h3>
    <div className={styles.rentalHeading}><strong>{summary.status}</strong><span>{summary.occupancy}</span></div>
    <div className={styles.rentalHeading}>{recoveryActions.map((action, index) => <Link key={action} className={index === 0 ? styles.rentalPrimary : undefined} href={rentalActionHref(draftId, action)}>{rentalActionLabel(action, summary, pathway)}</Link>)}{model.agreementHref && <Link href={model.agreementHref}>Review signed agreement and return documents</Link>}</div>
    <p><strong>Next action</strong> · {inactive && !summary.closed && summary.stage !== "CANCELLED" ? "Ask a manager to review this inactive deal and reconcile custody." : summary.nextAction}</p>
    {checkoutNeedsAgreement && <p role="alert">A finalized checkout agreement for this vehicle is required before handoff.</p>}
    {!canAct && !inactive && <p>Ask the deal owner or a manager with vehicle handoff access to record changes.</p>}
    {summary.warnings.length > 0 && <ul role="alert">{summary.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
    <ol className={styles.rentalSteps} aria-label="Rental lifecycle progress">{summary.steps.map(step => <li key={step.label}>{step.complete ? "✓" : "○"} {step.label}</li>)}</ol>
    <dl className={styles.rentalFacts}><div><dt>Scheduled pickup</dt><dd>{rentalTime(booking?.startsAt)}</dd></div><div><dt>Actual checkout</dt><dd>{rentalTime(summary.checkedOutAt)}</dd></div><div><dt>Due back</dt><dd>{rentalTime(summary.dueBack)}</dd></div><div><dt>Actual return</dt><dd>{rentalTime(summary.returnedAt)}</dd></div>{summary.closed && <div><dt>Completion recorded</dt><dd>{rentalTime(summary.completedAt)}</dd></div>}{!loaner && <div><dt>Insurance verified through</dt><dd>{rentalTime(typeof booking?.departureSnapshot?.insuranceValidUntil === "string" ? booking.departureSnapshot.insuranceValidUntil : null)}</dd></div>}</dl>
    {([ ["Checkout evidence", booking?.departureSnapshot], ["Return inspection", booking?.returnSnapshot] ] as const).map(([label, snapshot]) => <details key={label}><summary>{label}</summary>{!snapshot ? <p>No actual {label.toLowerCase()} recorded.</p> : <dl className={styles.rentalFacts}>{["odometer", "fuel", "condition", "recipient", "keysVerified", "physicalHandover", "evidence"].map(key => <div key={key}><dt>{({ keysVerified: "Keys", physicalHandover: "Physical handover", recipient: "Receiving person" } as Record<string, string>)[key] ?? key}</dt><dd>{evidenceValue(snapshot[key])}</dd></div>)}</dl>}</details>)}
    <details><summary>Activity &amp; audit trail ({model.events.length})</summary>{model.events.length ? <ol>{model.events.map(event => {
      const audit = (event.result as { audit?: { reason?: string; previousDueBack?: string; dueBack?: string } } | null)?.audit;
      return <li key={event.id}><strong>{activityLabels[event.action] ?? event.action}</strong> · {rentalTime(event.occurredAt)} · Staff reference: {event.actorUserId}
        {audit?.reason && <p>{audit.reason}</p>}
        {event.action === "EXTEND" && audit?.previousDueBack && <p>Due back changed from {rentalTime(audit.previousDueBack)} to {rentalTime(audit.dueBack)}</p>}
      </li>;
    })}</ol> : <p>No custody activity recorded.</p>}</details>
  </section>;
}
export function RentalOperationsPanel({ draftId, fallback, ...options }: Omit<Parameters<typeof RentalOperationsDetails>[0], "model" | "draftId"> & { draftId: string | null; fallback?: RentalWork | null }) {
  const [model, setModel] = useState<RentalOperations | null>(null), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!draftId) return;
    const controller = new AbortController();
    void fetch(`/api/crm/v1/deal-continuity/${encodeURIComponent(draftId)}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (response.status === 404 && options.canAct && !options.inactive && body.error === "Save a deal with its shared customer and vehicle first.") {
        return { bookings: [], events: [], agreementHref: null };
      }
      if (!response.ok) throw new Error(body.error || "Rental status could not be loaded.");
      return body;
    }).then(body => {
      if (controller.signal.aborted) return;
      setModel(body); setError("");
    }).catch(caught => { if (!controller.signal.aborted) setError(caught.message); });
    return () => controller.abort();
  }, [draftId, revision, options.canAct, options.inactive]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setRevision(value => value + 1); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener(RENTAL_OPERATIONS_CHANGED, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener(RENTAL_OPERATIONS_CHANGED, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  if (!draftId) return <section className={styles.useTool} aria-label="Rental lifecycle operations">
    {fallback && <><div className={styles.rentalHeading}><strong>{fallback.status}</strong><span>{fallback.occupancy}</span></div>
      <dl className={styles.rentalFacts}><div><dt>Actual checkout</dt><dd>{rentalTime(fallback.checkedOutAt)}</dd></div><div><dt>Due back</dt><dd>{rentalTime(fallback.dueBack)}</dd></div><div><dt>Actual return</dt><dd>{rentalTime(fallback.returnedAt)}</dd></div></dl></>}
    <p>No saved deal is linked. Review the original record with a manager before recording custody.</p>
  </section>;
  return <>{error ? <p role="alert">{error}</p> : model ? <RentalOperationsDetails model={model} draftId={draftId} {...options} /> : <p role="status">Loading rental lifecycle…</p>}<button type="button" onClick={() => setRevision(value => value + 1)}>Refresh rental operations</button></>;
}
