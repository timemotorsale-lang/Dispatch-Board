"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { depositAmount, depositCurrency, depositDate, depositDisclosure, depositMethods, depositNumber, depositTerms, type DepositMethod } from "@/lib/customer-sales-deposits";
import styles from "./customer360-workspace.module.css";

type Deposit = { id: string; amountCents: number; method: DepositMethod; vehicleLabel: string | null; nonRefundable: boolean; receivedAt: string; refundedAt: string | null };
type Vehicle = { id: string; label: string; vin: string };
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
  const [linkVehicle, setLinkVehicle] = useState(false);
  const [nonRefundable, setNonRefundable] = useState(false);
  const [method, setMethod] = useState<DepositMethod>("CASH");
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ id: string; label: string } | null>(null);
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
    void read(controller.signal).then(setLedger).catch(() => {
      if (!controller.signal.aborted) setLoadError("Deposits could not be loaded.");
    });
    return () => controller.abort();
  }, [read, loadAttempt]);
  useEffect(() => {
    if (editorAction === "receive") amountRef.current?.focus();
    else if (editorAction === "refund") formRef.current?.focus();
  }, [editorAction]);

  function start() {
    setError(""); setNotice(null); setSearch(""); setVehicles(null); setVehicle(null);
    setLinkVehicle(false); setNonRefundable(false); setMethod("CASH");
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
    if (editor.action === "receive" && (!depositAmount(form.get("amount")) || linkVehicle && !vehicle)) {
      setError("Enter a positive dollar amount and choose a vehicle if you are placing a hold."); return;
    }
    const data = Object.fromEntries(form);
    setBusy(true); setError("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        ...data, action: editor.action, id: editor.id, confirmed: form.get("confirmed") === "on",
        ...(editor.action === "receive" ? { method, nonRefundable, termsPresented: form.get("termsPresented") === "on", vehicleId: vehicle?.id ?? null } : {})
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setNotice({ id: result.id, label: editor.action === "refund" ? "Full refund recorded. Any vehicle deposit hold was released." : "Payment recorded. Receipt is ready." });
      setEditor(null);
      try { setLedger(await read()); } catch { setLoadError("Saved. Reopen the deposits list to refresh it."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Save could not be confirmed. Retry the same action."); }
    finally { setBusy(false); }
  }

  function receipt(id: string) {
    return <a target="_blank" rel="noopener noreferrer" href={`${url}?receipt=${encodeURIComponent(id)}`}>Review / print receipt</a>;
  }

  return <div className={styles.wishSection}>
    <div className={styles.wishHeader}>
      <div><h3>Customer deposits</h3><p>Record money already received, with or without an inventory vehicle.</p></div>
      {ledger?.canRecord && !editor && <button type="button" disabled={busy} onClick={start}>Record deposit</button>}
    </div>
    {loadError ? <div className={styles.actions}><p role="alert">{loadError}</p><button type="button" onClick={() => { setLoadError(""); setLoadAttempt(i => i + 1); }}>Reload deposits</button></div>
      : !ledger ? <p role="status">Loading deposits…</p> : null}
    {ledger && !ledger.canRecord && <p>A manager can record deposits and refunds.</p>}
    {notice && <div className={styles.actions}><span role="status">{notice.label}</span>{receipt(notice.id)}</div>}
    {error && <p role="alert">{error}</p>}
    {editor && <form ref={formRef} tabIndex={-1} className={styles.form} onSubmit={save} aria-label={editor.action === "receive" ? "Record deposit" : "Record full refund"}>
      <fieldset disabled={busy} className={styles.depositFields}>
      {editor.action === "receive" ? <>
        <div className={styles.wishFields}>
          <label><span>Amount ($)</span><input ref={amountRef} required inputMode="decimal" name="amount" maxLength={12} placeholder="500.00" /></label>
          <label><span>Payment method</span><select value={method} onChange={event => setMethod(event.target.value as DepositMethod)}>
            {Object.entries(depositMethods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label><span>Transaction reference {method === "CASH" ? "(optional)" : ""}</span><input name="reference" maxLength={64} required={method !== "CASH"} /></label>
        </div>
        {method === "OTHER_CARD" && <p>Record the approval reference from your card terminal. This does not charge the card. Do not enter a card number.</p>}
        <label className={styles.depositCheck}><input type="checkbox" checked={linkVehicle} disabled={finding} onChange={event => {
          setLinkVehicle(event.target.checked); setVehicle(null); setVehicles(null);
        }} /> Link a vehicle and place a hold</label>
        {linkVehicle && (vehicle ? <div className={styles.actions}><strong>{vehicle.label}</strong><span>{vehicle.vin}</span>
          <button type="button" onClick={() => { setVehicle(null); setVehicles(null); }}>Change vehicle</button></div>
          : <div className={styles.depositFields}>
            <div className={styles.wishFields}><label><span>Search ready inventory by VIN, stock number, make or model</span>
              <input value={search} maxLength={60} onChange={event => { setSearch(event.target.value); setVehicles(null); }}
                onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (!finding && search.trim().length >= 2) void findVehicle(); } }} /></label></div>
            <div className={styles.actions}><button type="button" disabled={finding || search.trim().length < 2} onClick={() => void findVehicle()}>{finding ? "Searching…" : "Find vehicle"}</button></div>
            {vehicles?.length ? <ul className={styles.rows}>{vehicles.map(result => <li key={result.id}><div><strong>{result.label}</strong><small>{result.vin}</small></div>
              <button type="button" onClick={() => setVehicle(result)}>Select {result.label}</button></li>)}</ul>
              : vehicles && <p>No matching frontline-ready vehicles without a deposit hold were found.</p>}
          </div>)}
        <label className={styles.depositCheck}><input type="checkbox" checked={nonRefundable} onChange={event => setNonRefundable(event.target.checked)} /> Mark non-refundable</label>
        <details className={styles.subsection} open>
          <summary>Deposit terms to show the customer</summary>
          {depositTerms(linkVehicle, nonRefundable).split("\n").map(line => <p key={line}>{line}</p>)}
          <p><strong>{depositDisclosure}</strong></p>
        </details>
        <label className={styles.depositCheck}><input key={`${linkVehicle}:${vehicle?.id ?? ""}:${nonRefundable}`} type="checkbox" name="termsPresented" required /> I showed these terms to the customer and confirmed their agreement.</label>
        <label className={styles.depositCheck}><input name="confirmed" type="checkbox" required /> I verified that the payment was received.</label>
      </> : <>
        <p><strong>{depositCurrency(editor.deposit.amountCents)} full refund</strong>{editor.deposit.vehicleLabel ? ` · ${editor.deposit.vehicleLabel}` : ""}</p>
        {editor.deposit.nonRefundable && <p>This deposit was marked non-refundable. Only record a refund that has actually been issued and verified.</p>}
        <div className={styles.wishFields}>
          <label><span>Amount actually refunded ($)</span><input name="amount" inputMode="decimal" required maxLength={12} /></label>
          <label><span>Refund transaction reference</span><input name="reference" required maxLength={64} /></label>
          <label><span>Refund reason</span><input name="reason" required maxLength={200} /></label>
        </div>
        <label className={styles.depositCheck}><input name="confirmed" type="checkbox" required /> I verified the full refund was issued via the original payment channel.</label>
      </>}
      <div className={styles.actions}>
        <button type="submit" disabled={finding}>{editor.action === "receive" ? "Record deposit and issue receipt" : "Record full refund"}</button>
        <button type="button" disabled={finding} onClick={() => { setEditor(null); setError(""); }}>Cancel</button>
      </div>
      </fieldset>
    </form>}
    {ledger?.deposits.length ? <ul className={styles.rows} aria-label="Saved deposits">{ledger.deposits.map(deposit => <li key={deposit.id}>
      <div><strong>{depositCurrency(deposit.amountCents)} · {deposit.refundedAt ? "Refunded" : deposit.vehicleLabel ? "Vehicle held" : "Received"}</strong>
        <small>{deposit.vehicleLabel ?? "No vehicle linked"} · {depositMethods[deposit.method]} · {deposit.nonRefundable ? "Non-refundable terms" : "Refundable terms"}</small>
        <small>{depositDate(deposit.receivedAt)} Central · {depositNumber(deposit.id)}</small>
      </div>
      {receipt(deposit.id)}
      {ledger.canRecord && !deposit.refundedAt && <button type="button" disabled={!!editor || busy} onClick={() => {
        setError(""); setNotice(null); setEditor({ action: "refund", id: deposit.id, deposit });
      }}>Refund…</button>}
    </li>)}</ul> : ledger && <p>No customer deposits recorded.</p>}
  </div>;
}
