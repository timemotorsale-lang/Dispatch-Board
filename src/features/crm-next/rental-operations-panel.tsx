"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { rentalOperationsSummary, type RentalOperations } from "@/lib/rental-operations";
import styles from "./shared-deal-identities.module.css";

const displayTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString("en-US", { timeZone: "America/Chicago" }) + " Central" : "Not recorded";
const evidenceValue = (value: unknown) => value == null ? "Not recorded" : Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? value ? "Verified" : "Not verified" : String(value);
export function RentalOperationsDetails({ model, draftId, packetClosed, inactive = false }: { model: RentalOperations; draftId: string; packetClosed: boolean; inactive?: boolean }) {
  const summary = rentalOperationsSummary(model.bookings, packetClosed);
  const href = `/crm-next/deals/start?draftId=${encodeURIComponent(draftId)}`;
  const booking = summary.booking;
  return <section className={styles.useTool} aria-label="Rental lifecycle operations">
    <h3>Daily Rental Operations</h3><div className={styles.rentalHeading}><strong>{summary.status}</strong><span>Deal stage: {summary.delivered ? "Delivered" : "Handover pending"}</span></div>
    <p><strong>Next rental action:</strong> {inactive ? "Review inactive rental and reconcile any outstanding vehicle custody" : summary.nextAction}</p>
    {summary.warnings.length > 0 && <ul role="alert">{summary.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
    <ol className={styles.rentalSteps} aria-label="Rental lifecycle progress">{summary.steps.map(step => <li key={step.label}>{step.complete ? "✓" : "○"} {step.label}</li>)}</ol>
    <dl className={styles.rentalFacts}><div><dt>Scheduled pickup</dt><dd>{displayTime(booking?.startsAt)}</dd></div><div><dt>Actual checkout</dt><dd>{displayTime(booking?.checkedOutAt)}</dd></div><div><dt>Due back</dt><dd>{displayTime(booking?.expectedReturnAt)}</dd></div><div><dt>Actual return</dt><dd>{displayTime(booking?.returnedAt)}</dd></div><div><dt>Vehicle availability</dt><dd>{summary.active ? "Out on Rental" : summary.returned ? "Returned · review condition before reassignment" : "Rechecked at checkout"}</dd></div><div><dt>Insurance verified through</dt><dd>{displayTime(typeof booking?.departureSnapshot?.insuranceValidUntil === "string" ? booking.departureSnapshot.insuranceValidUntil : null)}</dd></div></dl>
    <div className={styles.rentalHeading}>{!inactive && !summary.closed && <Link href={`${href}&rentalAction=${summary.active ? "RETURN" : "HANDOFF"}#rental-checkout`}>{summary.active ? "Record rental return" : summary.returned ? "Open return review" : "Open rental checkout / Activate Rental"}</Link>}{!inactive && summary.active && <Link href={`${href}&rentalAction=EXTEND#rental-checkout`}>Extend due-back time</Link>}{model.agreementHref && <Link href={model.agreementHref}>Review rental agreement / close paperwork</Link>}</div>
    {([ ["Checkout evidence", booking?.departureSnapshot], ["Return inspection", booking?.returnSnapshot] ] as const).map(([label, snapshot]) => <details key={label}><summary>{label}</summary>{!snapshot ? <p>No actual {label.toLowerCase()} recorded.</p> : <dl className={styles.rentalFacts}>{["odometer", "fuel", "condition", "recipient", "keysVerified", "physicalHandover", "evidence"].map(key => <div key={key}><dt>{({ keysVerified: "Keys", physicalHandover: "Physical handover", recipient: "Receiving person" } as Record<string, string>)[key] ?? key}</dt><dd>{evidenceValue(snapshot[key])}</dd></div>)}</dl>}</details>)}
    <details><summary>Rental activity &amp; audit trail ({model.events.length})</summary>{model.events.length ? <ol>{model.events.map(event => <li key={event.id}><strong>{({ RESERVE: "Checkout scheduled", HANDOFF: "Rental activated", EXTEND: "Due-back extended", RETURN: "Vehicle returned", CANCEL: "Reservation cancelled" } as Record<string, string>)[event.action] ?? event.action}</strong> · {displayTime(event.occurredAt)} · Staff reference: {event.actorUserId}</li>)}</ol> : <p>No rental operations recorded. Signed paperwork alone does not activate a rental.</p>}</details>
  </section>;
}
export function RentalOperationsPanel({ draftId, packetClosed, inactive }: { draftId: string | null; packetClosed: boolean; inactive: boolean }) {
  const [model, setModel] = useState<RentalOperations | null>(null), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!draftId) return;
    const controller = new AbortController();
    void fetch(`/api/crm/v1/deal-continuity/${encodeURIComponent(draftId)}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Rental status could not be loaded.");
      if (!controller.signal.aborted) { setModel(body); setError(""); }
    }).catch(caught => { if (!controller.signal.aborted) setError(caught.message); });
    const timer = setInterval(() => { if (document.visibilityState === "visible") setRevision(value => value + 1); }, 60000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [draftId, revision]);
  if (!draftId) return <p>Open the original saved rental to link its shared customer and vehicle before recording custody.</p>;
  return <>{error ? <p role="alert">{error} Open the existing rental to review identities and permissions; do not create a duplicate.</p> : model ? <RentalOperationsDetails model={model} draftId={draftId} packetClosed={packetClosed} inactive={inactive} /> : <p role="status">Loading rental lifecycle…</p>}<button type="button" onClick={() => setRevision(value => value + 1)}>Refresh rental operations</button></>;
}
