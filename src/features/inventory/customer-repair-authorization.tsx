"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { DocumentApproval } from "./document-approval";
import styles from "./customer-repair-authorization.module.css";

type Props = {
  repairOrderId: string;
  version: number;
  concern: string;
  customerName: string;
  consent: { status: string; reference: string | null };
  canAct: boolean;
  estimateId?: string;
  hasSavedEstimate: boolean;
  legacyEstimateHref?: string;
  vendor: boolean;
  laborGuideHref: string;
  planningHref: string;
  continueHref: string;
};

export function CustomerRepairAuthorization(props: Props) {
  const router = useRouter();
  const [inspectionSaved, setInspectionSaved] = useState(false);
  const [repairSaved, setRepairSaved] = useState(false);

  return (
    <div className={styles.authorization}>
      <section aria-label="Inspection and diagnosis permission">
        <h3>Inspection &amp; diagnosis permission</h3>
        <p><strong>Saved concerns</strong> {props.concern}</p>
        {inspectionSaved || props.consent.status === "DOCUMENTED" ? (
          <p role="status">{inspectionSaved ? "Inspection permission saved." : "Visit consent is documented."}
            {props.consent.reference && <> Evidence reference {props.consent.reference}.</>}
          </p>
        ) : props.canAct ? (
          <InspectionPermissionForm
            repairOrderId={props.repairOrderId}
            version={props.version}
            customerName={props.customerName}
            onSaved={() => { setInspectionSaved(true); router.refresh(); }}
          />
        ) : <p>An advisor with repair-order access can record permission.</p>}
      </section>
      <section aria-label="Quoted repair authorization">
        {props.canAct && props.estimateId && !props.vendor && !repairSaved ? (
          <DocumentApproval
            repairOrderId={props.repairOrderId}
            estimateId={props.estimateId}
            customerName={props.customerName}
            showQuotedScope
            onApproved={() => setRepairSaved(true)}
          />
        ) : <>
          <h3>Quoted repair authorization</h3>
          {repairSaved ? <p role="status">Customer decision recorded. Review the approved scope before preparing work orders.</p>
            : props.vendor ? <p>Review the vendor quote and authorization on this repair order.</p>
            : props.estimateId ? <p>An advisor with repair-order access can record the decision for the current estimate.</p>
            : props.legacyEstimateHref ? <p>Reissue a reviewed copy of the saved estimate before recording repair approval.</p>
            : props.hasSavedEstimate ? <p>Open the saved estimate and present a current version before recording a new approval.</p>
            : <p>Present a saved estimate before recording approval for quoted repairs.</p>}
        </>}
        <div className={styles.links}>
          {repairSaved && <Link className="pill pill-primary" prefetch={false} href={props.continueHref}>Continue repair order</Link>}
          {props.canAct && !props.estimateId && !props.vendor && <Link className="pill" href={props.laborGuideHref}>Open Labor Guide</Link>}
          {props.legacyEstimateHref && <Link className="pill" href={props.legacyEstimateHref}>View saved estimate</Link>}
          {(props.vendor || props.hasSavedEstimate) && <Link className="pill" href={props.planningHref}>{props.vendor ? "Open vendor authorization" : "Open full authorization tools"}</Link>}
        </div>
      </section>
    </div>
  );
}

function InspectionPermissionForm({ repairOrderId, version, customerName, onSaved }: {
  repairOrderId: string;
  version: number;
  customerName: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(customerName);
  const [channel, setChannel] = useState("IN_PERSON");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<string | null>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!confirmed && !pending.current) || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      pending.current ??= JSON.stringify({
        action: "RECORD_INSPECTION_CONSENT",
        expectedVersion: version,
        customerName: name.trim(),
        channel,
        consentReference: reference.trim(),
        confirmed,
        consentedAt: new Date().toISOString(),
        idempotencyKey: crypto.randomUUID()
      });
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/planning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: pending.current
      });
      if (response.status < 500 && !response.ok) pending.current = null;
      const data = await response.json();
      if (response.status === 409) throw new Error("The repair order changed. Reload authorization and review the saved concerns before recording permission.");
      if (!response.ok) throw new Error(data.error ?? "Inspection permission could not be saved.");
      if (data.result?.id !== repairOrderId || data.result?.consentStatus !== "DOCUMENTED") throw new Error("Confirmation was incomplete. Retry the same permission record.");
      pending.current = null;
      setRetry(false);
      onSaved();
    } catch (failure) {
      setRetry(Boolean(pending.current));
      setError(failure instanceof Error ? failure.message : "Inspection permission could not be saved.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy || retry}>
        <legend>Record customer permission</legend>
        <label>Customer / authorized representative<input required maxLength={200} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Permission method
          <select value={channel} onChange={event => setChannel(event.target.value)}>
            <option value="IN_PERSON">In person</option><option value="PHONE">Phone</option>
            <option value="EMAIL">Email</option><option value="SMS">Text message</option>
          </select>
        </label>
        <label>Evidence reference<input required maxLength={200} value={reference} onChange={event => setReference(event.target.value)} placeholder="Signed intake, email, or documented call" /></label>
        <label className={styles.confirm}><input required type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> The customer gave permission to inspect and diagnose the saved concerns.</label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button className="pill pill-primary" type="submit" disabled={busy || !confirmed}>{busy ? "Saving…" : retry ? "Retry same permission record" : "Save inspection permission"}</button>
    </form>
  );
}
