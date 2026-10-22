"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BarcodeScanner } from "./barcode-scanner";
import { IdFrontCapture } from "./id-front-capture";
import { emptyIdFields, type FrontIdFields } from "./id-capture-fields";
import { MOBILE_HOME_HREF } from "./capture-navigation";
import { customerDate, customerFieldsFromBarcode, intakeRequest } from "./mobile-intake-utils";
import styles from "./mobile-intake.module.css";

type CustomerReceipt = { customer: { id: string; displayName: string }; duplicate: boolean };

export function MobileCustomerIntake({ initialFields, onCancel, onSaved }: { initialFields?: FrontIdFields; onCancel?: () => void; onSaved?: () => void }) {
  const prefix = useId();
  const [fields, setFields] = useState(() => ({ ...emptyIdFields(), ...initialFields, dateOfBirth: customerDate(initialFields?.dateOfBirth ?? "") }));
  const [step, setStep] = useState(initialFields ? "CONTACT" : "SCAN");
  const [scanner, setScanner] = useState<"FRONT" | "BACK" | null>(null);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [locationId, setLocationId] = useState("");
  const [optionsState, setOptionsState] = useState("LOADING");
  const [retry, setRetry] = useState(0);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<CustomerReceipt | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const saving = useRef(false);

  useEffect(() => {
    let cancelled = false;
    intakeRequest<{ locations: { id: string; name: string }[] }>("/api/service-intake/customers/options").then((result) => {
      if (cancelled) return;
      setLocations(result.locations); setLocationId(result.locations.length === 1 ? result.locations[0].id : ""); setOptionsState("READY");
    }).catch(() => { if (!cancelled) setOptionsState("ERROR"); });
    return () => { cancelled = true; };
  }, [retry]);
  useEffect(() => { if (step === "CONTACT") phoneRef.current?.focus(); }, [step]);

  function applyFields(next: FrontIdFields) {
    setFields({ ...next, dateOfBirth: customerDate(next.dateOfBirth) }); setReviewed(false); setScanner(null); setError(""); setStep("CONTACT");
  }
  function update(name: keyof FrontIdFields, value: string) { setFields((previous) => ({ ...previous, [name]: value })); setReviewed(false); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || receipt) return;
    if (!phone.trim() && !email.trim()) { setError("Add a phone number or email so the team can contact this customer."); phoneRef.current?.focus(); return; }
    if (!reviewed) { setError("Review the name, ID details and contact information, then confirm below."); return; }
    saving.current = true; setBusy(true); setError("");
    try {
      const result = await intakeRequest<CustomerReceipt>("/api/service-intake/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        displayName: fields.fullName, address: fields.address, dateOfBirth: fields.dateOfBirth, idNumber: fields.licenseNumber,
        idState: fields.issuingState, idType: fields.licenseNumber ? "GOVERNMENT_ID" : "", phoneNumber: phone, email,
        locationId, preferredContactMethod: phone.trim() ? "PHONE" : "EMAIL"
      }) });
      setReceipt(result); setFields(emptyIdFields()); setPhone(""); setEmail("");
      onSaved?.();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Customer could not be saved. Your entries are still here."); }
    finally { saving.current = false; setBusy(false); }
  }

  return <section className={styles.workspace} aria-label="Mobile customer intake">
    <nav className={styles.nav}><Link href={MOBILE_HOME_HREF}>← Mobile home</Link>{onCancel ? <button type="button" disabled={busy} onClick={onCancel}>Back to capture</button> : null}</nav>
    <p className={styles.steps}>{receipt ? "Complete" : step === "SCAN" ? "1 · Capture ID" : "2 · Contact & confirm"}</p>
    <h1>{receipt ? receipt.duplicate ? "Existing customer found" : "Customer added" : "Add customer"}</h1>
    {receipt ? <div className={styles.card} role="status"><h2>{receipt.customer.displayName}</h2><p>{receipt.duplicate ? "A record with this phone or email already exists. No duplicate was created and the existing ID details were not overwritten. Review the record before using it." : "Customer details saved. You can continue in the customer record."}</p><Link className={styles.primary} href={`/crm-next/customers/${encodeURIComponent(receipt.customer.id)}`}>Review customer record</Link><button type="button" onClick={() => { setReceipt(null); setStep("SCAN"); setReviewed(false); setError(""); }}>Add another customer</button></div> : <>
      {step === "SCAN" ? <div className={styles.card}><h2>Start with an ID</h2><p>Scan the back barcode for the quickest entry, or photograph the front. You’ll review the result before adding contact details.</p><button className={styles.primary} type="button" onClick={() => setScanner("BACK")}>Scan ID barcode</button><button className={styles.primary} type="button" onClick={() => setScanner("FRONT")}>Photograph ID front / back</button><div className={styles.actions}><button type="button" onClick={() => setStep("CONTACT")}>Enter details manually</button></div><p className={styles.hint}>Only reviewed information is saved. ID images are not attached by this customer flow. Scanning does not verify identity or grant messaging consent.</p></div> : <form onSubmit={save}>
        <fieldset disabled={busy}>
          <div className={styles.card}><h2>How can we reach them?</h2><p>Captured details are filled below. Add at least one contact method.</p>
            <label htmlFor={`${prefix}-phone`}>Phone number<input id={`${prefix}-phone`} ref={phoneRef} type="tel" autoComplete="tel" value={phone} maxLength={50} onChange={(event) => { setPhone(event.target.value); setReviewed(false); }} /></label>
            <label htmlFor={`${prefix}-email`}>Email address<input id={`${prefix}-email`} type="email" autoComplete="email" value={email} maxLength={200} onChange={(event) => { setEmail(event.target.value); setReviewed(false); }} /></label>
            <label htmlFor={`${prefix}-name`}>Full name<input id={`${prefix}-name`} required maxLength={160} autoComplete="name" value={fields.fullName} onChange={(event) => update("fullName", event.target.value)} /></label>
            <label htmlFor={`${prefix}-location`}>Customer location<select id={`${prefix}-location`} required value={locationId} onChange={(event) => { setLocationId(event.target.value); setReviewed(false); }}><option value="">Choose location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
            <details><summary>Review ID details &amp; address</summary>
              <label htmlFor={`${prefix}-address`}>Address<textarea id={`${prefix}-address`} maxLength={500} value={fields.address} onChange={(event) => update("address", event.target.value)} /></label>
              <label htmlFor={`${prefix}-dob`}>Date of birth<input id={`${prefix}-dob`} type="date" value={fields.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} /></label>
              <label htmlFor={`${prefix}-id`}>ID number · hidden for privacy<input id={`${prefix}-id`} type="password" autoComplete="off" maxLength={40} value={fields.licenseNumber} onChange={(event) => update("licenseNumber", event.target.value)} /></label>
              <label htmlFor={`${prefix}-state`}>Issuing state<input id={`${prefix}-state`} maxLength={2} value={fields.issuingState} onChange={(event) => update("issuingState", event.target.value.toUpperCase())} /></label>
              <p className={styles.hint}>The customer record retains only the ID’s last four digits, not the full ID number or image. Unread dates remain blank for manual review.</p>
            </details>
            <label className={styles.check}><input type="checkbox" required checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />I reviewed the captured identity details and contact information with the customer.</label>
            <button className={styles.primary} disabled={optionsState !== "READY" || !locations.length || busy} type="submit">{busy ? "Saving customer…" : "Confirm & add customer"}</button>
          </div>
        </fieldset>
      </form>}
      {optionsState === "ERROR" ? <p className={styles.error} role="alert">Locations could not load. <button type="button" onClick={() => { setOptionsState("LOADING"); setRetry((previous) => previous + 1); }}>Retry locations</button></p> : optionsState === "READY" && !locations.length ? <p className={styles.error} role="alert">Your account does not have customer-creation access at any location. Ask your manager for access; scanning remains available.</p> : null}
    </>}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {scanner === "BACK" ? <BarcodeScanner idOnly onClose={() => setScanner(null)} onConfirm={(result) => { const scanned = customerFieldsFromBarcode(result.value); if (scanned) applyFields(scanned); else { setScanner(null); setError("This barcode did not contain supported ID details. Try the ID photo or enter details manually."); } }} /> : null}
    {scanner === "FRONT" ? <IdFrontCapture onClose={() => setScanner(null)} onComplete={(_file, scanned, mismatch) => { applyFields(mismatch ? emptyIdFields() : scanned); if (mismatch) setError("The ID sides disagree. Captured identity details were not applied. Enter only identity details you can verify manually."); }} /> : null}
  </section>;
}
