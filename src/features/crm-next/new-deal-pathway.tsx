"use client";
import { useState } from "react";
import styles from "./deal-workspace-overview.module.css";
export function NewDealPathway({ options, onChoose }: { options: Array<{ id: string; label: string; helper: string }>; onChoose: (id: string) => void }) {
  const [selected, setSelected] = useState("");
  return <section className={styles.panel} aria-label="New deal revenue pathway"><h1>Start a new deal</h1><h2>Step 1 · Choose the revenue pathway</h2><p>Choose how the customer will use or purchase the vehicle before entering the deal. No deal is created until you continue and save.</p><form onSubmit={event => { event.preventDefault(); if (options.some(option => option.id === selected)) onChoose(selected); }}><label>Revenue pathway<select required value={selected} onChange={event => setSelected(event.target.value)}><option value="">Choose a revenue pathway…</option>{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>{selected && <p>{options.find(option => option.id === selected)?.helper}</p>}<div className={styles.actions}><button className={styles.primary} disabled={!selected} type="submit">Continue to customer &amp; vehicle</button></div></form></section>;
}
