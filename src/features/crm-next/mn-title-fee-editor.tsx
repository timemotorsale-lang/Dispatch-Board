"use client";

import { useRef, useState } from "react";
import { MN_TITLE_FEE_SCHEDULE, MN_PLATE_FEE_SCHEDULE, cashTitleFeeItems, cashTitleFeeTotal, cashMoney, type CashSaleFacts, type CashTitleFeeItem } from "@/lib/cash-retail-sale";
import styles from "./mn-title-fee-editor.module.css";

type Props = { facts: CashSaleFacts; onChange: (items: string, total: string) => void };
export function MnTitleFeeEditor({ facts, onChange }: Props) {
  const details = useRef<HTMLDetailsElement>(null);
  const [selected, setSelected] = useState("title"), [schedule, setSchedule] = useState("no-lien");
  const [plates, setPlates] = useState("");
  const catalog = [...MN_TITLE_FEE_SCHEDULE, ...MN_PLATE_FEE_SCHEDULE];
  let items: CashTitleFeeItem[] = [], error = "", total = 0;
  try { items = cashTitleFeeItems(facts); total = cashTitleFeeTotal(facts); }
  catch (caught) { error = caught instanceof Error ? caught.message : "Review title fee amounts."; }
  function update(next: CashTitleFeeItem[]) {
    const serialized = JSON.stringify(next);
    let amount = "";
    try { amount = (cashTitleFeeTotal({ titleFee: "", titleFeeItems: serialized }) / 100).toFixed(2); } catch { /* Keep unfinished entries editable; packet validation stays authoritative. */ }
    onChange(serialized, amount);
  }
  function add() {
    if (items.length >= 20) return;
    const known = catalog.find(item => item.id === selected);
    if (known && items.some(item => item.id === known.id)) return;
    update([...items, known ? { ...known } : { id: crypto.randomUUID(), label: "Other quoted title fee", amount: "0.00" }]);
  }
  return <div className={styles.editor}>
    <label><span>Title, transfer &amp; plate fees</span><input readOnly value={error ? "Review fee amounts" : cashMoney(total)} aria-describedby="mn-title-fee-help" /></label>
    <details ref={details} className={styles.panel}><summary>Select / edit MN title, transfer &amp; plate fees</summary>
      <p id="mn-title-fee-help">Choose applicable fees and edit them to match the DVS transaction quote. Amounts below are published starting values, not automatic charges. Registration tax / tabs and sales tax remain separate. Existing registration amounts are kept: separate any included plate charges before adding plates here.</p>
      <label><span>Typical Minnesota title fee schedule</span><select aria-label="Typical Minnesota title fee schedule" value={schedule} onChange={event => setSchedule(event.target.value)}>
        <option value="no-lien">Typical title transfer — no lien ($36.00)</option><option value="one-lien">Typical title transfer — one lien ($38.00)</option>
      </select></label>
      <label><span>Plates to include in schedule</span><select aria-label="Plates to include in schedule" value={plates} onChange={event => setPlates(event.target.value)}><option value="">No plate charge / retain existing plates</option>{MN_PLATE_FEE_SCHEDULE.map(item => <option key={item.id} value={item.id}>{item.label} — {cashMoney(Number(item.amount) * 100)}</option>)}</select></label>
      <button type="button" onClick={() => update([...MN_TITLE_FEE_SCHEDULE.filter(item => schedule === "one-lien" || item.id !== "lien"), ...MN_PLATE_FEE_SCHEDULE.filter(item => item.id === plates)].map(item => ({ ...item })))}>Use selected schedule — replace current fees</button>
      <label><span>Add Minnesota title or plate fee</span><select aria-label="Add Minnesota title or plate fee" value={selected} onChange={event => setSelected(event.target.value)}>{catalog.map(item => <option key={item.id} value={item.id} disabled={items.some(row => row.id === item.id || (item.id.startsWith("plate-") && row.id.startsWith("plate-")))}>{item.label} — {cashMoney(Number(item.amount) * 100)}</option>)}<option value="custom">Other quoted title / transfer / plate fee</option></select></label>
      <button type="button" disabled={items.length >= 20 || items.some(item => item.id === selected)} onClick={add}>Add fee</button>
      <div className={styles.items}>{items.map(item => <div key={item.id} className={styles.row}>
        <label><span>Fee name</span><input aria-label={`Fee name: ${item.label}`} value={item.label} maxLength={80} onChange={event => update(items.map(row => row.id === item.id ? { ...row, label: event.target.value } : row))} /></label>
        <label><span>Amount ($)</span><input aria-label={`Amount: ${item.label}`} inputMode="decimal" value={item.amount} onChange={event => update(items.map(row => row.id === item.id ? { ...row, amount: event.target.value } : row))} /></label>
        <button type="button" aria-label={`Remove ${item.label}`} onClick={() => update(items.filter(row => row.id !== item.id))}>Remove</button>
      </div>)}</div>
      {!items.length && <p>No title fees selected.</p>}
      {error && <p role="alert">{error}</p>}
      <p aria-live="polite"><strong>Title fee total: {error ? "Review amounts" : cashMoney(total)}</strong></p>
      <a href="https://assets.dps.mn.gov/files/dvs/BuyingorSellingMotorVehicle_Just_the_Facts.pdf" target="_blank" rel="noreferrer">Minnesota DVS published typical fees</a>
      <a href="https://www.revisor.mn.gov/statutes/cite/168.12#stat.168.12.5" target="_blank" rel="noreferrer">Minnesota published plate fee schedule</a>
      <button type="button" disabled={Boolean(error)} onClick={() => { if (details.current) details.current.open = false; details.current?.querySelector("summary")?.focus(); }}>Done — use title fee total</button>
    </details>
  </div>;
}
