"use client";
import { useEffect, useState } from "react";
import { CashPrintPacks } from "./cash-print-packs";
import { ALL_SALE_LIBRARY_FORMS, CASH_PRINT_PACKS, WHOLESALE_ORIGINAL_FORMS, saleLibraryCatalog } from "@/lib/cash-sale-print-library";
import { EMPTY_CASH_SALE } from "@/lib/cash-retail-sale";
import { BHPH_FORM_PACKET } from "@/lib/bhph-form-packet";
import { MN_SALE_FORM_PACKET } from "@/lib/mn-vehicle-sale-form-packet";
import { SALE_LIBRARY_PATHWAYS, formsLibraryDealHref, isSaleLibraryPathway, libraryFormsForPathway } from "@/lib/forms-library-navigation";
import styles from "./forms-library-workspace.module.css";

type SavedDeal = { id: string; dealNumber?: number; customerName: string; vehicleReference: string; pathway: string; status: string };
type Results = { items: SavedDeal[]; page: number; pages: number; total: number };
const archives = [
  { label: "Previous BHPH packet", forms: BHPH_FORM_PACKET },
  { label: "Previous retail / financing packet", forms: MN_SALE_FORM_PACKET },
  { label: "Wholesale original document set", forms: WHOLESALE_ORIGINAL_FORMS }
];
const presets = [...CASH_PRINT_PACKS, ...SALE_LIBRARY_PATHWAYS.map(pathway => ({ id: `library-${pathway.id}`, label: `${pathway.label} forms`, detail: "Shared library forms for this sales pathway; requirements are checked inside the deal.", ids: saleLibraryCatalog(pathway.id).map(form => form.id) }))];

export function FormsLibraryWorkspace() {
  const [tab, setTab] = useState("forms"), [pathway, setPathway] = useState("ALL");
  const [search, setSearch] = useState(""), [category, setCategory] = useState(""), [onlySelected, setOnlySelected] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [dealQuery, setDealQuery] = useState(""), [request, setRequest] = useState<{ search: string; page: number; version: number } | null>(null);
  const [results, setResults] = useState<Results | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const [deal, setDeal] = useState<SavedDeal | null>(null);
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(""); setResults(null);
      const params = new URLSearchParams({ view: "library", search: request.search, page: String(request.page), pathway, status: "ALL" });
      void fetch(`/api/crm/v1/deal-drafts?${params}`, { cache: "no-store", signal: controller.signal }).then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Saved deals could not be loaded. Retry the search.");
        if (!Array.isArray(body.items)) throw new Error("The saved-deal list could not be read. Retry the search.");
        if (!controller.signal.aborted) setResults(body);
      }).catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Saved deals could not be loaded. Retry the search."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [request, pathway]);
  const catalog = isSaleLibraryPathway(pathway) ? saleLibraryCatalog(pathway) : ALL_SALE_LIBRARY_FORMS;
  const rows = catalog.filter(form => (!category || form.category === category) && (!onlySelected || selected.includes(form.id)) && `${form.label} ${form.id}`.toLowerCase().includes(search.toLowerCase()));
  const selectedForDeal = deal && isSaleLibraryPathway(deal.pathway) ? libraryFormsForPathway(selected, deal.pathway) : [];
  const skipped = selected.filter(id => !selectedForDeal.includes(id));
  const href = deal && isSaleLibraryPathway(deal.pathway) ? formsLibraryDealHref(deal.id, deal.pathway, selected) : "";
  const changePathway = (value: string) => { setPathway(value); setCategory(""); setDeal(null); setResults(null); };
  function findDeals(page = 1) { setDeal(null); setRequest({ search: dealQuery.trim(), page, version: (request?.version || 0) + 1 }); }
  return <main className={styles.workspace}>
    <header><h1>Forms Library</h1><p>Choose individual forms or a team pack. Select a saved deal to review populated copies and print.</p></header>
    <section className={styles.panel} aria-label="Deal for populated forms">
      <h2>Prepare forms for a deal</h2>
      <form className={styles.controls} onSubmit={event => { event.preventDefault(); findDeals(); }}>
        <label>Sales pathway<select value={pathway} onChange={event => changePathway(event.target.value)}><option value="ALL">All sales pathways</option>{SALE_LIBRARY_PATHWAYS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>Find your saved deal<input value={dealQuery} onChange={event => setDealQuery(event.target.value)} placeholder="Customer, deal number or vehicle" maxLength={240} /></label>
        <button type="submit" disabled={loading}>{loading ? "Finding deals…" : "Find deal"}</button>
      </form>
      <p className={styles.note}>Your saved deals use the same access permissions as the deal workspace. No deal details or status are changed here.</p>
      {loading && <p role="status">Loading your saved deals…</p>}
      {error && <p role="alert">{error}</p>}
      {results && !loading && <div className={styles.results} aria-label="Saved deal results">
        {results.items.filter(item => isSaleLibraryPathway(item.pathway) && !["ARCHIVED", "LOST", "CANCELLED"].includes(item.status)).map(item => <label key={item.id} className={styles.deal}>
          <input type="radio" name="library-deal" checked={deal?.id === item.id} onChange={() => setDeal(item)} />
          <span><strong>{item.dealNumber ? `#${item.dealNumber} · ` : ""}{item.customerName || "Customer not selected"}</strong><small>{item.vehicleReference || "Vehicle not selected"} · {SALE_LIBRARY_PATHWAYS.find(path => path.id === item.pathway)?.label} · {item.status.replaceAll("_", " ")}</small></span>
        </label>)}
        {!results.items.some(item => isSaleLibraryPathway(item.pathway) && !["ARCHIVED", "LOST", "CANCELLED"].includes(item.status)) && <p>No available sales deals on this page. Refine your search or check another page.</p>}
        <div className={styles.controls}><button type="button" disabled={results.page <= 1} onClick={() => findDeals(results.page - 1)}>Previous deals</button><span>Page {results.page} of {results.pages}</span><button type="button" disabled={results.page >= results.pages} onClick={() => findDeals(results.page + 1)}>Next deals</button></div>
      </div>}
      {deal && <div className={styles.chosen} role="status"><strong>Selected: {deal.customerName} · {deal.vehicleReference || "Vehicle not selected"}</strong><p>{selected.length ? `${selectedForDeal.length} selected forms apply to this pathway.` : "The deal’s current form selection will open."} Conditional forms and signed originals are checked inside the deal.</p>{selected.length > 0 && skipped.length > 0 && <p>Not used for this pathway: {skipped.map(id => ALL_SALE_LIBRARY_FORMS.find(form => form.id === id)?.label).join(", ")}.</p>}</div>}
    </section>
    <div className={styles.tabs} role="tablist" aria-label="Forms Library views" onKeyDown={event => {
      const ids = ["forms", "packs", "archived"];
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const index = event.key === "Home" ? 0 : event.key === "End" ? 2 : (ids.indexOf(tab) + (event.key === "ArrowRight" ? 1 : 2)) % 3;
      setTab(ids[index]); document.getElementById(`forms-library-tab-${ids[index]}`)?.focus();
    }}>{[["forms", "All forms"], ["packs", "Team print packs"], ["archived", "Archived packs"]].map(([id, label]) => <button key={id} id={`forms-library-tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`forms-library-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}>{label}</button>)}</div>
    <section hidden={tab !== "packs"} id="forms-library-panel-packs" role="tabpanel" aria-labelledby="forms-library-tab-packs" className={styles.panel}>
      <h2>Team print packs</h2><p>Create a reusable pack from selected forms, or edit an existing team pack. Deal-specific requirements are checked when the pack is used.</p>
      <CashPrintPacks selectionOnly facts={EMPTY_CASH_SALE} catalog={ALL_SALE_LIBRARY_FORMS} presets={presets} selected={selected} onSelect={setSelected} busy={false} />
    </section>
    <section hidden={tab !== "forms"} id="forms-library-panel-forms" role="tabpanel" aria-labelledby="forms-library-tab-forms" className={styles.panel}>
      <div className={styles.controls}><label>Search forms<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Form name or ID" /></label><label>Category<select value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{[...new Set(catalog.map(form => form.category))].map(value => <option key={value}>{value}</option>)}</select></label><label className={styles.check}><input type="checkbox" checked={onlySelected} onChange={event => setOnlySelected(event.target.checked)} />Selected only</label></div>
      <div className={styles.controls}><span>{rows.length} of {catalog.length} forms shown · {selected.length} selected across pathways</span><button type="button" onClick={() => setSelected(current => [...new Set([...current, ...rows.map(form => form.id)])])}>Select shown forms</button><button type="button" onClick={() => setSelected([])}>Clear selection</button></div>
      <ul className={styles.forms}>{rows.map(form => <li key={form.id}>
        <label className={styles.formChoice}><input type="checkbox" checked={selected.includes(form.id)} onChange={event => setSelected(current => event.target.checked ? [...new Set([...current, form.id])] : current.filter(id => id !== form.id))} /><span><strong>{form.label}</strong><small>{form.category} · {form.language}</small></span></label>
        <div className={styles.formAction}>{form.finalTemplate ? <a aria-label={`View blank template: ${form.label} (opens a new tab)`} href={`/api/crm/v1/cash-sale-forms?id=${encodeURIComponent(form.id)}`} target="_blank" rel="noreferrer">View blank template</a> : <span>{form.originalOnly ? "Uploaded original required in deal" : "Prepared using saved deal details"}</span>}</div>
      </li>)}</ul>{!rows.length && <p>No forms match these filters.</p>}
    </section>
    <section hidden={tab !== "archived"} id="forms-library-panel-archived" role="tabpanel" aria-labelledby="forms-library-tab-archived" className={styles.panel}>
      <h2>Previous pathway packs</h2><p>These previous form sets remain available for reference. Select a deal above, open its forms, then choose Archived packs to access its original saved copies and signed-document archive.</p>
      {archives.map(pack => <details key={pack.label}><summary>{pack.label} · {pack.forms.length} forms</summary><ul>{pack.forms.map(form => <li key={form.id}>{form.label}</li>)}</ul></details>)}
    </section>
    <footer className={styles.footer}><strong>{selected.length} forms selected</strong><span>{deal ? `For ${deal.customerName}` : "Choose a deal above for populated forms"}</span>{href && (!selected.length || selectedForDeal.length) ? <a className={styles.primary} href={href}>Open deal forms &amp; review</a> : <button type="button" disabled>Open deal forms &amp; review</button>}</footer>
  </main>;
}
