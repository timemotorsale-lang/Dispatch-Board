"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { MoreVertical, ArrowRight, FilePlus2, Banknote, Gauge, ShoppingCart } from "lucide-react";
import styles from "./frontline-preparation-workspace.module.css";

export type VehicleRecordContext = {
  specifications: Array<[string, string]>;
  timeline: Array<{ id: string; occurredAt: string; source: string; type: string; title: string; detail: string | null; actorName?: string | null }>;
  available: boolean;
};

export function VehicleTools({ vehicleId }: { vehicleId: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const id = encodeURIComponent(vehicleId);
  const actions = [
    { label: "Start Deal", href: `/crm-next/deals/start?${new URLSearchParams({ vehicleId, pathway: "retail-sale", new: "1" })}`, icon: FilePlus2 },
    { label: "Start Desk", href: `/crm-next/deals/start?${new URLSearchParams({ vehicleId, pathway: "finance", new: "1" })}`, icon: FilePlus2 },
    { label: "Start As-Is Sale", href: `/vehicles/${id}/sale?mode=as-is`, icon: ShoppingCart },
    { label: "Mark as Sold / review", href: `/vehicles/retail-completion?vehicleId=${id}`, icon: ShoppingCart },
    { label: "Deposit / reservation review", href: `/vehicles/retail-completion?vehicleId=${id}`, icon: Banknote },
    { label: "View Appraisal Info", href: `/vehicles/acquisition-appraisal?vehicleId=${id}`, icon: Gauge },
    { label: "Vehicle record", href: `/vehicles/360/${id}`, icon: ArrowRight }
  ];
  return <details ref={menu} className={styles.tools} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); if (menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); } }
  }}><summary aria-label="More vehicle tools" title="More vehicle tools"><MoreVertical size={18}/></summary><nav aria-label="Vehicle tools" onClick={() => { if (menu.current) menu.current.open = false; }}>{actions.map(({ label, href, icon: Icon }) => <Link key={label} href={href}><Icon size={16}/>{label}</Link>)}<button type="button" disabled title="Vehicle deletion is not supported by the governed inventory workflow">Mark as Deleted (unavailable)</button><button type="button" disabled title="A customer-safe public vehicle preview is not connected">Show Customer View (unavailable)</button></nav></details>;
}

export function VehicleLogs({ context }: { context: VehicleRecordContext | null }) {
  const [filters, setFilters] = useState({ from: "", to: "", source: "", query: "" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const rows = (context?.timeline ?? []).filter(item => {
    const occurred = new Date(item.occurredAt);
    const day = `${occurred.getFullYear()}-${String(occurred.getMonth() + 1).padStart(2, "0")}-${String(occurred.getDate()).padStart(2, "0")}`;
    return (!applied.from || day >= applied.from) && (!applied.to || day <= applied.to) && (!applied.source || item.source === applied.source) && (!applied.query || `${item.title} ${item.detail ?? ""} ${item.type}`.toLowerCase().includes(applied.query.toLowerCase()));
  });
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const currentPage = Math.min(page, pages);
  return <section><h2>Vehicle Logs</h2><form className={styles.filters} onSubmit={event => { event.preventDefault(); setApplied(filters); setPage(1); }}>
    <label>From<input type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })}/></label>
    <label>To<input type="date" min={filters.from || undefined} value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })}/></label>
    <label>Source<select aria-label="Log source" value={filters.source} onChange={event => setFilters({ ...filters, source: event.target.value })}><option value="">All sources</option>{[...new Set(context?.timeline.map(item => item.source))].map(source => <option key={source}>{source}</option>)}</select></label>
    <label>Search<input type="search" value={filters.query} onChange={event => setFilters({ ...filters, query: event.target.value })}/></label>
    <button type="submit">Filter</button><button type="button" onClick={() => { const empty = { from: "", to: "", source: "", query: "" }; setFilters(empty); setApplied(empty); setPage(1); }}>Clear</button>
  </form>{!context?.available ? <p role="status">Vehicle history is temporarily unavailable.</p> : null}
    <div className={styles.table}><table><thead><tr><th>Created date</th><th>Created by</th><th>Source</th><th>Type</th><th>Description</th></tr></thead><tbody>{rows.slice((currentPage - 1) * 25, currentPage * 25).map(item => <tr key={item.id}><td>{new Date(item.occurredAt).toLocaleString()}</td><td>{item.actorName ?? "Not recorded"}</td><td>{item.source}</td><td>{item.type.replaceAll("_", " ")}</td><td><strong>{item.title}</strong>{item.detail ? <p>{item.detail}</p> : null}</td></tr>)}{!rows.length ? <tr><td colSpan={5}>No matching records.</td></tr> : null}</tbody></table></div>
    <div className={styles.pagination}><span>{rows.length} records / page {currentPage} of {pages}</span><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div>
  </section>;
}
