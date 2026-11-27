"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { depositAgreementIssue, depositAmount, depositCurrency, depositDate, depositDisclosure, depositKinds, depositMethods, depositNumber, depositTerms, readDepositAgreement, safeDepositReference, vehicleDepositTerms, type DepositKind, type DepositMethod } from "@/lib/customer-sales-deposits";
import { DepositReceiptOptions } from "./deposit-receipt-options";
import styles from "./customer360-workspace.module.css";

type Deposit = { id: string; kind: DepositKind; amountCents: number; method: DepositMethod; vehicleLabel: string | null; vin: string | null; needsInventoryIntake: boolean; nonRefundable: boolean; receivedAt: string; refundedAt: string | null };
type Vehicle = { id: string; label: string; vin: string | null; color: string | null };
type Ledger = { deposits: Deposit[]; canRecord: boolean };
type Editor = { action: "receive"; id: string } | { action: "refund"; id: string; deposit: Deposit };

export function CustomerSalesDeposits({ customerId }: { customerId: string }) {
  const url = `/api/crm-next/customers/${encodeURIComponent(customerId)}/deposits`;
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [search, setSearch] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [kind, setKind] = useState<DepositKind>("GENERAL");
  const [showroom, setShowroom] = useState(false);
  const [agreementFields, setAgreementFields] = useState<Record<string, string>>({});
  const [agreementRevision, setAgreementRevision] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [nonRefundable, setNonRefundable] = useState(false);
  const [method, setMethod] = useState<DepositMethod>("CASH");
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ id: string; label: string } | null>(null);
  const [receiptOptions, setReceiptOptions] = useState<{ id: string; newlySaved: boolean } | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const editorAction = editor?.action;
  const read = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(url, { cache: "no-store", signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data as Ledger;
  }, [url]);

  useEffect(() => {
    const controller = new AbortController();
    void read(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setLedger(result);
      const receipt = new URLSearchParams(window.location.search).get("depositReceipt");
      if (receipt && result.deposits.some(row => row.id === receipt)) setReceiptOptions({ id: receipt, newlySaved: false });
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError("Deposits could not be loaded.");
    });
    return () => controller.abort();
  }, [read, loadAttempt]);
  useEffect(() => {
    if (editorAction === "receive") amountRef.current?.focus();
    else if (editorAction === "refund") formRef.current?.focus();
  }, [editorAction]);

  function start() {
    setError(""); setNotice(null); setReceiptOptions(null); setSearch(""); setVehicles(null); setVehicle(null);
    setKind("GENERAL"); setShowroom(false); setAgreementFields({}); setAgreementRevision(0); setPaymentAmount(""); setNonRefundable(false); setMethod("CASH");
    setEditor({ action: "receive", id: crypto.randomUUID() });
  }
  async function findVehicle() {
    setFinding(true); setError(""); setVehicles(null);
    try {
      const response = await fetch(`${url}?vehicleSearch=${encodeURIComponent(search.trim())}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setVehicles(data.vehicles);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not find vehicles."); }
    finally { setFinding(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || busy || finding) return;
    const form = new FormData(event.currentTarget);
    if (editor.action === "receive" && !depositAmount(form.get("amount"))) {
      setError("Enter a positive dollar amount before recording the deposit."); amountRef.current?.focus(); return;
    }
    if (editor.action === "receive" && kind === "RESERVATION" && !showroom && !vehicle) {
      setError("Select a vehicle from the search results, or choose Showroom vehicle not in inventory."); return;
    }
    if (editor.action === "receive" && (method !== "CASH" || String(form.get("reference") ?? "").trim()) && !safeDepositReference(form.get("reference"))) {
      setError("Enter a valid transaction reference, not a card number."); return;
    }
    if (editor.action === "receive" && kind !== "GENERAL") {
      const issue = depositAgreementIssue(kind, readDepositAgreement(Object.fromEntries(form)), depositAmount(form.get("amount")));
      if (issue) {
        setError(issue.message);
        const field = event.currentTarget.elements.namedItem(issue.field);
        if (field instanceof HTMLInputElement) field.focus();
        return;
      }
    }
    if (editor.action === "receive" && form.get("termsPresented") !== "on") {
      setError(kind === "GENERAL" ? "Confirm that the customer saw and agreed to the deposit terms." : "Confirm that the customer signed the agreement."); return;
    }
    if (form.get("confirmed") !== "on") {
      setError(editor.action === "receive" ? "Confirm that the payment was received." : "Confirm that the full refund was issued."); return;
    }
    if (editor.action === "refund" && (!depositAmount(form.get("amount")) || !safeDepositReference(form.get("reference")) || !String(form.get("reason") ?? "").trim())) {
      setError("Enter the refunded amount, refund reference and reason."); return;
    }
    const data = Object.fromEntries(form);
    setBusy(true); setError("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        ...data, action: editor.action, id: editor.id, confirmed: form.get("confirmed") === "on",
        ...(editor.action === "receive" ? { kind, method, nonRefundable, termsPresented: form.get("termsPresented") === "on", vehicleId: vehicle?.id ?? null } : {})
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (editor.action === "receive") {
        setEditor(null);
        setReceiptOptions({ id: result.id, newlySaved: true });
        try { setLedger(await read()); } catch { setLoadError("Deposit saved. Reload deposits to refresh the list."); }
        return;
      }
      setNotice({ id: result.id, label: "Full refund recorded. Any vehicle deposit hold was released." });
      setEditor(null);
      try { setLedger(await read()); } catch { setLoadError("Saved. Reopen the deposits list to refresh it."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Save could not be confirmed. Retry the same action."); }
    finally { setBusy(false); }
  }

  const agreement = readDepositAgreement(agreementFields);
  const agreementTermLines = kind === "GENERAL" ? depositTerms(false, nonRefundable) : vehicleDepositTerms(kind, agreement, nonRefundable);
  function agreementInput(name: string, title: string, props: { maxLength?: number; inputMode?: "numeric" | "decimal"; type?: "date"; required?: boolean }) {
    return <label><span>{title}</span><input {...props} name={name} value={agreementFields[name] ?? ""} onChange={event => {
      const value = event.target.value;
      setAgreementFields(previous => ({ ...previous, [name]: value }));
      setAgreementRevision(previous => previous + 1);
    }} /></label>;
  }
  return <div className={styles.wishSection}>
    <div className={styles.wishHeader}>
      <div><h3>Customer deposits</h3><p>Reserve a vehicle, record a sourcing order, or record a general deposit.</p></div>
      {ledger?.canRecord && !editor && <button type="button" disabled={busy} onClick={start}>Record deposit</button>}
    </div>
    {loadError ? <div className={styles.actions}><p role="alert">{loadError}</p><button type="button" onClick={() => { setLoadError(""); setLoadAttempt(i => i + 1); }}>Reload deposits</button></div>
      : !ledger ? <p role="status">Loading deposits…</p> : null}
    {ledger && !ledger.canRecord && <p>A manager can record deposits and refunds.</p>}
    {notice && <div className={styles.actions}><span role="status">{notice.label}</span></div>}
    {receiptOptions && <DepositReceiptOptions key={receiptOptions.id} url={url} id={receiptOptions.id} newlySaved={receiptOptions.newlySaved}
      canRecord={ledger?.canRecord === true} onClose={() => setReceiptOptions(null)} />}
    {editor && <form ref={formRef} tabIndex={-1} className={styles.form} noValidate onSubmit={save} aria-label={editor.action === "receive" ? "Record deposit" : "Record full refund"}>
      <fieldset disabled={busy} className={styles.depositFields}>
      {editor.action === "receive" ? <>
        <div className={styles.wishFields}><label><span>Deposit type</span><select value={kind} disabled={finding} onChange={event => {
          setKind(event.target.value as DepositKind); setShowroom(false); setVehicle(null); setVehicles(null); setSearch(""); setAgreementFields({});
        }}>{Object.entries(depositKinds).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label></div>
        <div className={styles.wishFields}>
          <label><span>Amount ($)</span><input ref={amountRef} required inputMode="decimal" name="amount" maxLength={12} placeholder="500.00" onChange={event => {
            setPaymentAmount(event.target.value);
            setAgreementRevision(previous => previous + 1);
          }} /></label>
          <label><span>Payment method</span><select value={method} onChange={event => setMethod(event.target.value as DepositMethod)}>
            {Object.entries(depositMethods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label><span>Transaction reference {method === "CASH" ? "(optional)" : ""}</span><input name="reference" maxLength={64} required={method !== "CASH"} /></label>
        </div>
        {(["CREDIT_CARD", "DEBIT_CARD", "OTHER_CARD", "MOBILE_WALLET"] as DepositMethod[]).includes(method) && <p>Record the approval reference from your card terminal. This does not charge the card. Do not enter a card number.</p>}
        {kind === "RESERVATION" && <label className={styles.depositCheck}><input type="checkbox" checked={showroom} disabled={finding} onChange={event => {
          setShowroom(event.target.checked); setVehicle(null); setVehicles(null); setAgreementFields({});
        }} /> Showroom vehicle not in inventory</label>}
        {kind === "RESERVATION" && !showroom && (vehicle ? <div className={styles.actions}><strong>{vehicle.label}</strong><span>{vehicle.vin}</span>
          <button type="button" onClick={() => { setVehicle(null); setVehicles(null); }}>Change vehicle</button></div>
          : <div className={styles.depositFields}>
            <div className={styles.wishFields}><label><span>Search ready inventory by VIN, stock number, year, make, model or color</span>
              <input value={search} maxLength={60} onChange={event => { setSearch(event.target.value); setVehicles(null); }}
                onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (!finding && search.trim().length >= 2) void findVehicle(); } }} /></label></div>
            <div className={styles.actions}><button type="button" disabled={finding || search.trim().length < 2} onClick={() => void findVehicle()}>{finding ? "Searching…" : "Find vehicle"}</button></div>
            {vehicles?.length ? <ul className={styles.rows}>{vehicles.map(result => <li key={result.id}><div><strong>{result.label}</strong><small>{[result.color, result.vin].filter(Boolean).join(" · ")}</small></div>
              <button type="button" onClick={() => setVehicle(result)}>Select {result.label}</button></li>)}</ul>
              : vehicles && <p>No matching frontline-ready vehicles without a deposit hold were found. Try the stock number, VIN, or fewer details.</p>}
          </div>)}
        {(kind === "ORDER" || showroom) && <div className={styles.wishFields}>
          {agreementInput("agreementYear", "Vehicle year", { maxLength: 4, inputMode: "numeric", required: true })}
          {agreementInput("agreementMake", "Make", { maxLength: 40, required: true })}
          {agreementInput("agreementModel", "Model", { maxLength: 40, required: true })}
          {agreementInput("agreementVin", showroom ? "VIN" : "Exact VIN (if known)", { maxLength: 17, required: showroom })}
        </div>}
        {kind !== "GENERAL" && <div className={styles.wishFields}>
          {agreementInput("agreementPrice", kind === "ORDER" ? "Maximum total price ($)" : "Agreed total price ($)", { inputMode: "decimal", maxLength: 12, required: true })}
          {agreementInput("agreementDeadline", kind === "ORDER" ? "Source by" : "Purchase by", { type: "date", required: true })}
          {agreementInput("agreementCriteria", kind === "ORDER" ? "Specifications and contingencies (optional)" : "Contingencies (optional)", { maxLength: 200 })}
        </div>}
        {kind === "ORDER" && <p>No inventory is held. Use the signed order to guide sourcing and confirm the vehicle meets the agreed terms before purchasing it.</p>}
        {showroom && <p>Saving reserves this exact VIN without creating an inventory record.</p>}
        {kind !== "GENERAL" && <p>Keep the signed copy on the customer record. The app assigns the agreement and receipt number when you save.</p>}
        <label className={styles.depositCheck}><input type="checkbox" checked={nonRefundable} onChange={event => setNonRefundable(event.target.checked)} /> {kind === "GENERAL" ? "Mark non-refundable" : "Allow manager review for retention if the buyer backs out"}</label>
        <details className={styles.subsection} open>
          <summary>Deposit terms to show the customer</summary>
          {kind !== "GENERAL" && <p>{[vehicle?.label || [agreement.year, agreement.make, agreement.model].filter(Boolean).join(" "), vehicle?.vin || agreementFields.agreementVin,
            depositAmount(paymentAmount) ? `Deposit ${depositCurrency(depositAmount(paymentAmount))}` : ""].filter(Boolean).join(" · ")}</p>}
          {(kind === "GENERAL" || (agreement.deadline && agreement.price) ? agreementTermLines.split("\n") : ["Enter the price and deadline to preview the agreement terms."]).map(line => <p key={line}>{line}</p>)}
          <p><strong>{depositDisclosure}</strong></p>
        </details>
        <label className={styles.depositCheck}><input key={`${kind}:${showroom}:${vehicle?.id ?? ""}:${nonRefundable}:${agreementRevision}`} type="checkbox" name="termsPresented" required /> {kind === "GENERAL" ? "I showed these terms to the customer and confirmed their agreement." : "I verified the customer signed these terms."}</label>
        <label className={styles.depositCheck}><input name="confirmed" type="checkbox" required /> I verified that the payment was received.</label>
      </> : <>
        <p><strong>{depositCurrency(editor.deposit.amountCents)} full refund</strong>{editor.deposit.vehicleLabel ? ` · ${editor.deposit.vehicleLabel}` : ""}</p>
        {editor.deposit.nonRefundable && <p>{editor.deposit.kind === "GENERAL" ? "This deposit was marked non-refundable." : "Review the signed cancellation terms before issuing a refund."} Only record a refund that has actually been issued and verified.</p>}
        <div className={styles.wishFields}>
          <label><span>Amount actually refunded ($)</span><input name="amount" inputMode="decimal" required maxLength={12} /></label>
          <label><span>Refund transaction reference</span><input name="reference" required maxLength={64} /></label>
          <label><span>Refund reason</span><input name="reason" required maxLength={200} /></label>
        </div>
        <label className={styles.depositCheck}><input name="confirmed" type="checkbox" required /> I verified the full refund was issued via the original payment channel.</label>
      </>}
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="submit" disabled={finding}>{busy ? "Saving…" : editor.action === "receive" ? "Record deposit and issue receipt" : "Record full refund"}</button>
        <button type="button" disabled={finding} onClick={() => { setEditor(null); setError(""); }}>Cancel</button>
      </div>
      </fieldset>
    </form>}
    {ledger?.deposits.length ? <ul className={styles.rows} aria-label="Saved deposits">{ledger.deposits.map(deposit => <li key={deposit.id}>
      <div><strong>{depositCurrency(deposit.amountCents)} · {deposit.refundedAt ? "Refunded" : deposit.kind === "ORDER" ? "Order deposit received" : deposit.kind === "RESERVATION" ? "VIN reservation recorded" : deposit.vehicleLabel ? "Vehicle held" : "Received"}</strong>
        <small>{deposit.vehicleLabel ?? "No vehicle linked"}{deposit.kind === "RESERVATION" && deposit.vin ? ` · ${deposit.vin}` : ""} · {depositMethods[deposit.method]} · {deposit.nonRefundable ? (deposit.kind === "GENERAL" ? "Non-refundable terms" : "Conditional retention terms") : "Refundable terms"}</small>
        <small>{depositDate(deposit.receivedAt)} Central · {depositNumber(deposit.id)}</small>
        {deposit.needsInventoryIntake && <small>VIN reserved. Inventory intake is still needed.</small>}
      </div>
      <button type="button" disabled={!!editor || busy} onClick={() => setReceiptOptions({ id: deposit.id, newlySaved: false })}>Receipt options</button>
      {ledger.canRecord && !deposit.refundedAt && <button type="button" disabled={!!editor || busy} onClick={() => {
        setError(""); setNotice(null); setReceiptOptions(null); setEditor({ action: "refund", id: deposit.id, deposit });
      }}>Refund…</button>}
    </li>)}</ul> : ledger && <p>No customer deposits recorded.</p>}
  </div>;
}
