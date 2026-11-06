"use client";

import { useRef, useState } from "react";
import { MN_TITLE_FEE_SCHEDULE, MN_PLATE_FEE_SCHEDULE, cashTitleFeeItems, cashTitleFeeTotal, cashMoney, type CashSaleFacts, type CashTitleFeeItem } from "@/lib/cash-retail-sale";
import styles from "./mn-title-fee-editor.module.css";

type Props = { facts: CashSaleFacts; onChange: (items: string, total: string) => void };
export function MnTitleFeeEditor({ facts, onChange }: Props) {
  const details = useRef<HTMLDetailsElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const previousAmounts = useRef<Record<string, CashTitleFeeItem>>({});
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
  function toggle(known: CashTitleFeeItem) {
    const current = items.find(item => item.id === known.id);
    if (current) { previousAmounts.current[known.id] = current; update(items.filter(item => item.id !== known.id)); }
    else if (items.length < 20) {
      const retained = items.filter(item => { if (known.id.startsWith("plate-") && item.id.startsWith("plate-")) { previousAmounts.current[item.id] = item; return false; } return true; });
      update([...retained, { ...(previousAmounts.current[known.id] || known) }]);
    }
  }
  const shortNames: Record<string, string> = { title: "Title", transfer: "Transfer tax", filing: "Filing", technology: "Technology", "public-safety": "Public safety", lien: "Lien recording", "plate-double": "Double plates", "plate-single": "Single plate" };
  return <div className={styles.editor}>
    <label><span>Title, transfer &amp; plate fees</span><input readOnly value={error ? "Review fee amounts" : cashMoney(total)} aria-describedby="mn-title-fee-help" /></label>
    <details ref={details} className={styles.panel} onToggle={event => { if (event.currentTarget.open && event.target === event.currentTarget) requestAnimationFrame(() => { if (details.current?.open) dropdown.current?.scrollIntoView({ block: "nearest" }); }); }} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); if (details.current) details.current.open = false; details.current?.querySelector("summary")?.focus(); } }}><summary>Choose fees</summary>
      <div ref={dropdown} role="group" aria-label="Title fee item selector" className={styles.dropdown}>
      <div className={styles.columns} aria-hidden="true"><span>Item</span><span>Amount ($)</span></div>
      <div className={styles.items}>{catalog.map(known => {
        const item = items.find(row => row.id === known.id);
        return <div key={known.id} className={styles.row}>
          <label className={styles.item}><input type="checkbox" aria-label={"Select " + known.label} checked={Boolean(item)} onChange={() => toggle(known)} /><span title={item?.label || known.label}>{item && item.label !== known.label ? item.label : shortNames[known.id]}</span></label>
          <input aria-label={"Amount: " + known.label} inputMode="decimal" disabled={!item} value={item?.amount ?? known.amount} onChange={event => update(items.map(row => row.id === known.id ? { ...row, amount: event.target.value } : row))} />
        </div>;
      })}{items.filter(item => !catalog.some(known => known.id === item.id)).map(item => <div key={item.id} className={styles.customRow}>
        <input aria-label={"Fee name: " + item.label} value={item.label} maxLength={80} onChange={event => update(items.map(row => row.id === item.id ? { ...row, label: event.target.value } : row))} />
        <input aria-label={"Amount: " + item.label} inputMode="decimal" value={item.amount} onChange={event => update(items.map(row => row.id === item.id ? { ...row, amount: event.target.value } : row))} />
        <button type="button" aria-label={"Remove " + item.label} onClick={() => update(items.filter(row => row.id !== item.id))}>×</button>
      </div>)}</div>
      {error && <p role="alert">{error}</p>}
      <div className={styles.total} aria-live="polite"><strong>Total</strong><strong>{error ? "Review amounts" : cashMoney(total)}</strong></div>
      <button type="button" className={styles.done} disabled={Boolean(error)} onClick={() => { if (details.current) details.current.open = false; details.current?.querySelector("summary")?.focus(); }}>Done — use title fee total</button>
      <details className={styles.more}><summary>More options</summary>
        <label><span>Typical Minnesota title fee schedule</span><select aria-label="Typical Minnesota title fee schedule" value={schedule} onChange={event => setSchedule(event.target.value)}>
          <option value="no-lien">Title transfer — no lien ($36.00)</option><option value="one-lien">Title transfer — one lien ($38.00)</option>
        </select></label>
        <label><span>Plates to include in schedule</span><select aria-label="Plates to include in schedule" value={plates} onChange={event => setPlates(event.target.value)}><option value="">No plate charge</option>{MN_PLATE_FEE_SCHEDULE.map(item => <option key={item.id} value={item.id}>{item.label} — {cashMoney(Number(item.amount) * 100)}</option>)}</select></label>
        <button type="button" onClick={() => update([...MN_TITLE_FEE_SCHEDULE.filter(item => schedule === "one-lien" || item.id !== "lien"), ...MN_PLATE_FEE_SCHEDULE.filter(item => item.id === plates)].map(item => ({ ...item })))}>Use selected schedule — replace current fees</button>
        <label><span>Add Minnesota title or plate fee</span><select aria-label="Add Minnesota title or plate fee" value={selected} onChange={event => setSelected(event.target.value)}>{catalog.map(item => <option key={item.id} value={item.id} disabled={items.some(row => row.id === item.id || (item.id.startsWith("plate-") && row.id.startsWith("plate-")))}>{shortNames[item.id]} — {cashMoney(Number(item.amount) * 100)}</option>)}<option value="custom">Other quoted fee</option></select></label>
        <button type="button" disabled={items.length >= 20 || items.some(item => item.id === selected)} onClick={add}>Add fee</button>
        <p id="mn-title-fee-help">Match the DVS quote. Registration tax / tabs and sales tax stay separate. If an existing registration amount includes plates, separate those charges before adding plates here.</p>
        <a href="https://assets.dps.mn.gov/files/dvs/BuyingorSellingMotorVehicle_Just_the_Facts.pdf" target="_blank" rel="noreferrer">DVS title fees</a>
        <a href="https://www.revisor.mn.gov/statutes/cite/168.12#stat.168.12.5" target="_blank" rel="noreferrer">MN plate fees</a>
      </details>
      </div>
    </details>
  </div>;
}
