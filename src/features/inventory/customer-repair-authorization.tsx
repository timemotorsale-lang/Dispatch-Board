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
  consent: { status: string; reference: string | null; feeCents?: number; customerName?: string };
  diagnosticOnly: boolean;
  inspectionHref: string;
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
  const [savedFee, setSavedFee] = useState<number | null>(null);
  const [repairSaved, setRepairSaved] = useState(false);

  const authorizedFee = savedFee ?? props.consent.feeCents;
  return (
    <div className={styles.authorization}>
      <section aria-label="Customer diagnostic authorization">
        <h3>Customer diagnostic authorization</h3>
        <p><strong>Customer concern</strong> {props.concern}</p>
        {authorizedFee != null || props.consent.status === "DOCUMENTED" ? (
          <>
            <p role="status">{authorizedFee != null
              ? `Diagnostic authorization recorded. Approved flat fee ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(authorizedFee / 100)}.`
              : "Visit consent is documented."}
              {props.consent.customerName && <> Authorized by {props.consent.customerName}.</>}
              {props.consent.reference && <> Evidence reference {props.consent.reference}.</>}
            </p>
            {props.diagnosticOnly && <Link className="pill pill-primary" prefetch={false} href={props.inspectionHref}>Open inspection checklist</Link>}
          </>
        ) : props.canAct ? (
          <InspectionPermissionForm
            repairOrderId={props.repairOrderId}
            version={props.version}
            customerName={props.customerName}
            onSaved={feeCents => { setSavedFee(feeCents); router.refresh(); }}
          />
        ) : <p>An advisor with repair-order access can record permission.</p>}
      </section>
      {!props.diagnosticOnly && <section aria-label="Quoted repair authorization">
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
      </section>}
    </div>
  );
}

function InspectionPermissionForm({ repairOrderId, version, customerName, onSaved }: {
  repairOrderId: string;
  version: number;
  customerName: string;
  onSaved: (feeCents: number) => void;
}) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("IN_PERSON");
  const [reference, setReference] = useState("");
  const [fee, setFee] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<string | null>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!confirmed && !pending.current) || inFlight.current) return;
    if (!pending.current && !/^\d+(?:\.\d{1,2})?$/.test(fee.trim())) {
      setError("Enter the flat diagnostic fee, including 0 for no charge.");
      return;
    }
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
        diagnosticFeeCents: Math.round(Number(fee) * 100),
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
      if (data.result?.id !== repairOrderId || data.result?.consentStatus !== "DOCUMENTED" || typeof data.result?.diagnosticFeeCents !== "number") throw new Error("Confirmation was incomplete. Retry the same permission record.");
      pending.current = null;
      setRetry(false);
      onSaved(data.result.diagnosticFeeCents);
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
        <legend>Customer decision</legend>
        <label>Flat diagnostic fee ($)
          <input required inputMode="decimal" maxLength={12} value={fee} onChange={event => { setFee(event.target.value); setConfirmed(false); }} placeholder="Enter 0 for no charge" />
        </label>
        <label>{channel === "IN_PERSON" ? "Customer signature (type full name)" : "Customer / authorized representative"}
          <input required autoComplete="off" maxLength={200} value={name} onChange={event => setName(event.target.value)} />
        </label>
        <label>Permission method
          <select value={channel} onChange={event => {
            setChannel(event.target.value);
            setName(event.target.value === "IN_PERSON" ? "" : customerName);
            setReference("");
            setConfirmed(false);
          }}>
            <option value="IN_PERSON">In person</option><option value="PHONE">Phone</option>
            <option value="EMAIL">Email</option><option value="SMS">Text message</option>
          </select>
        </label>
        {channel !== "IN_PERSON" && <label>{channel === "PHONE" ? "Phone number and call reference" : "Message or approval reference"}
          <input required maxLength={200} value={reference} onChange={event => setReference(event.target.value)} />
        </label>}
        <label className={styles.confirm}>
          <input required type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
          {channel === "IN_PERSON"
            ? "I authorize Time Motor Sales to inspect and diagnose the concern shown above and prepare a repair estimate. I agree to the flat diagnostic fee shown. Repairs require my separate approval."
            : "I verified the named customer authorized inspection, diagnosis, and estimate preparation for the saved concern, and agreed to the disclosed flat diagnostic fee."}
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button className="pill pill-primary" type="submit" disabled={busy || !confirmed}>{busy ? "Saving…" : retry ? "Retry same permission record" : "Record diagnostic authorization"}</button>
    </form>
  );
}
