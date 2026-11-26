"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CaptureDestinationPicker } from "./capture-destination-picker";
import { archiveFileHref, archiveKindLabel, businessCategories, captureKinds, type ArchiveTarget, type CaptureArchiveRow } from "./capture-archive-contract";
import { printCapture } from "./print-capture";
import styles from "./capture-archive.module.css";

type Result = { items: CaptureArchiveRow[]; next: string | null; destination: ArchiveTarget | null };
type Edit = { row: CaptureArchiveRow; destination: ArchiveTarget | null; description: string; category: string };

export function CaptureArchiveWorkspace({ ownerType, ownerId, batch, initialKind }: {
  ownerType?: string; ownerId?: string; batch?: string; initialKind?: string;
}) {
  const [kind, setKind] = useState(initialKind === "BUSINESS_CARD" ? initialKind : "");
  const [unfiled, setUnfiled] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [edit, setEdit] = useState<Edit | null>(null);
  const requestSequence = useRef(0);

  async function loadMore() {
    if (!result?.next || loading) return;
    const request = ++requestSequence.current;
    const params = new URLSearchParams({ q: search, kind, before: result.next });
    if (ownerType && ownerId) { params.set("ownerType", ownerType); params.set("ownerId", ownerId); }
    if (batch) params.set("batch", batch);
    if (unfiled) params.set("unfiled", "1");
    setLoading(true);
    try {
      const response = await fetch(`/api/capture-archive?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load older captures.");
      if (request === requestSequence.current) setResult(current => ({ ...data, items: [...(current?.items ?? []), ...data.items] }));
    } catch (error) {
      if (request === requestSequence.current) setNotice(error instanceof Error ? error.message : "Could not load older captures.");
    } finally { if (request === requestSequence.current) setLoading(false); }
  }

  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q: search, kind });
    if (ownerType && ownerId) { params.set("ownerType", ownerType); params.set("ownerId", ownerId); }
    if (batch) params.set("batch", batch);
    if (unfiled) params.set("unfiled", "1");
    void fetch(`/api/capture-archive?${params}`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open the capture archive.");
      if (!controller.signal.aborted) setResult(data);
    }).catch(error => {
      if (!controller.signal.aborted) { setNotice(error instanceof Error ? error.message : "Could not open the capture archive."); setResult(null); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ownerType, ownerId, batch, search, kind, unfiled, reload]);

  function resetList() {
    requestSequence.current += 1;
    setLoading(true); setNotice(""); setEdit(null);
    setReload(current => current + 1);
  }

  async function save() {
    if (!edit || working) return;
    setWorking(true);
    setNotice("");
    try {
      const response = await fetch("/api/capture-archive", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        id: edit.row.id, revision: edit.row.revision, destination: edit.destination,
        ...(edit.row.originalAvailable ? { description: edit.description, category: edit.category } : {})
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update filing.");
      resetList();
      setNotice("Filing updated. The original is still in the archive.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not update filing."); }
    finally { setWorking(false); }
  }

  return <main className={styles.page}>
    <nav className={styles.actions} aria-label="Capture navigation">
      <Link href="/capture">New capture</Link><Link href="/documents">Document Library</Link>
      {ownerId || batch ? <Link href="/capture/archive">All captures</Link> : null}
    </nav>
    <header><h1>{kind === "BUSINESS_CARD" ? "Business Cards" : "Capture Archive"}</h1>
      <p>{result?.destination ? `Filed to ${result.destination.label}` : batch ? "Saved files in this batch." : "Find originals, print, or file items to a customer or vehicle."}</p>
    </header>
    <section className={styles.panel} aria-label="Find captures">
      <div className={styles.actions}>
        <button type="button" aria-pressed={kind !== "BUSINESS_CARD"} onClick={() => { resetList(); setKind(""); }}>All files</button>
        <button type="button" aria-pressed={kind === "BUSINESS_CARD"} onClick={() => { resetList(); setKind("BUSINESS_CARD"); }}>Business cards</button>
      </div>
      <form className={styles.actions} onSubmit={event => { event.preventDefault(); resetList(); setSearch(query.trim()); }}>
        <label>Search captures<input value={query} maxLength={120} onChange={event => setQuery(event.target.value)} placeholder="File, description, business, or category" /></label>
        <label>Type<select value={kind} onChange={event => { resetList(); setKind(event.target.value); }}>
          <option value="">All types</option>{captureKinds.map(value => <option key={value} value={value}>{archiveKindLabel[value]}</option>)}
        </select></label>
        {!ownerId ? <label><span>Unfiled only</span><input type="checkbox" checked={unfiled} onChange={event => { resetList(); setUnfiled(event.target.checked); }} /></label> : null}
        <button className={styles.primary} type="submit">Search</button>
      </form>
    </section>
    {notice ? <p role="status">{notice}</p> : null}
    {loading && <p role="status">Loading captures…</p>}
    {!loading && !result && <div className={styles.actions}><button type="button" onClick={resetList}>Try again</button></div>}
    {result && !loading && !result.items.length && <p>No visible captures match this view.</p>}
    {result?.items.length ? <ul className={styles.items} aria-label="Saved captures">{result.items.map(item => <li className={styles.item} key={item.id}>
      <strong>{item.fileName}</strong>
      <small>{archiveKindLabel[item.kind]} · {item.kind === "BUSINESS_CARD" ? `${item.category ?? "Needs category"} · ` : ""}{item.destination?.label ?? "Unfiled"} · {new Date(item.createdAt).toLocaleDateString()}</small>
      {!item.originalAvailable && <p>The linked record is unavailable. Refile this capture to restore access.</p>}
      {item.description && <p>{item.description}</p>}
      {!!item.businessDetails.length && <dl className={styles.details}>{item.businessDetails.map((field, index) => <div key={index}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>}
      <div className={styles.actions}>
        {item.originalAvailable && <><a href={archiveFileHref(item.id)} target="_blank" rel="noreferrer">Open original</a>
        <button type="button" onClick={() => void printCapture(`${archiveFileHref(item.id)}&print=1`, item.contentType).catch(error => setNotice(error.message))}>Print</button></>}
        {item.canEdit && <button type="button" onClick={() => { setNotice(""); setEdit({ row: item, destination: item.destination, description: item.description, category: item.category ?? "" }); }}>{item.destination ? "Change filing" : "File or categorize"}</button>}
      </div>
      {edit?.row.id === item.id && <div className={styles.panel}>
        <CaptureDestinationPicker value={edit.destination} disabled={working} onChange={destination => setEdit({ ...edit, destination })} />
        {item.originalAvailable && <label>Description<input value={edit.description} maxLength={240} disabled={working} onChange={e => setEdit({ ...edit, description: e.target.value })} /></label>}
        {item.originalAvailable && item.kind === "BUSINESS_CARD" && <label>Business category<select value={edit.category} disabled={working} onChange={e => setEdit({ ...edit, category: e.target.value })}><option value="">Suggest from description</option>{businessCategories.map(category => <option key={category}>{category}</option>)}</select></label>}
        <div className={styles.actions}><button className={styles.primary} type="button" disabled={working} onClick={() => void save()}>Save filing</button><button type="button" disabled={working} onClick={() => setEdit(null)}>Cancel</button></div>
      </div>}
    </li>)}</ul> : null}
    {result?.next && <div className={styles.actions}><button type="button" disabled={loading} onClick={() => void loadMore()}>Load older captures</button></div>}
  </main>;
}
