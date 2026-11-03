"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction, type Dispatch } from "react";
import { Save, FolderOpen, Plus } from "lucide-react";
import { SALES_DOCUMENT_PATHWAYS } from "@/lib/sales-document-pathways";
import { chooseEntryDraft } from "@/lib/deal-workspace-navigation";
import overviewStyles from "./deal-workspace-overview.module.css";
import { SAVED_DEAL_STATUSES, type SavedDealStatus } from "@/lib/saved-deal-status";
import { SavedDealsLibrary } from "./saved-deals-library";
import styles from "./deal-draft-workspace.module.css";
import { dealGroup } from "@/lib/deal-dashboard";
import { DealLifecycleDialog, type DealLifecycleAction } from "./deal-lifecycle-dialog";

type Snapshot = Record<string, unknown>;
type DraftSummary = { customerId?: string | null; id: string; customerName: string; pathway: string; vehicleReference: string; updatedAt: string; status?: SavedDealStatus };
type Draft = DraftSummary & { revision: number; snapshot: Snapshot };
type Store = {
  draftId: () => string;
  read: (key: string) => unknown;
  write: (key: string, value: unknown) => void;
  seed: (key: string, value: unknown) => void;
  save: () => Promise<boolean>;
  saveError: () => string;
  completeSale: () => Promise<void>;
  saleStatus: SavedDealStatus;
  paperworkComplete: boolean;
  recordJacket: (pathway: string, id: string) => void;
  reference: (key: string, renew?: boolean) => string;
};
const DraftContext = createContext<Store | null>(null);
const SaveStateContext = createContext({ saved: false, message: "New deal" });
export const useDealSaveState = () => useContext(SaveStateContext);
const ScopeContext = createContext("desk");
export const useDealDraft = () => useContext(DraftContext);

function restoredValue<T>(saved: unknown, initial: T): T {
  if (saved === undefined || saved === null) return initial;
  if (Array.isArray(initial)) return (Array.isArray(saved) ? saved : initial) as T;
  if (typeof initial !== typeof saved) return initial;
  if (typeof initial === "object" && initial && typeof saved === "object" && !Array.isArray(saved)) {
    const defaults = initial as Record<string, unknown>, values = saved as Record<string, unknown>;
    if (!Object.keys(defaults).length) return Object.fromEntries(Object.entries(values).filter(([, value]) => typeof value === "string" || typeof value === "boolean")) as T;
    return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, restoredValue(values[key], value)])) as T;
  }
  return saved as T;
}

export function useDealDraftState<T>(name: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const store = useDealDraft(), scope = useContext(ScopeContext), key = `${scope}:${name}`;
  const [value, setValue] = useState<T>(() => {
    const defaults = typeof initial === "function" ? (initial as () => T)() : initial;
    return restoredValue(store?.read(key), defaults);
  });
  const current = useRef(value);
  useEffect(() => { store?.seed(key, value); }, [key, store, value]);
  const update = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    const next = typeof action === "function" ? (action as (value: T) => T)(current.current) : action;
    current.current = next;
    setValue(next);
    store?.write(key, next);
  }, [key, store]);
  return [value, update];
}

type ArchivedPacketState<T> = { loading: boolean; error: string; dirty: boolean; retry: () => Promise<T | null> };
export function useArchivedDealPacket<T extends { packetId: string; jacketId?: string }>(preserveSavedPacket = false): [T | null, (packet: T | null) => void, ArchivedPacketState<T>] {
  const [packetId, setPacketId] = useDealDraftState("generatedPacketId", "");
  const [dirty, setDirty] = useDealDraftState("generatedPacketDirty", false);
  const [packet, setPacket] = useState<T | null>(null);
  const store = useDealDraft(), pathway = useContext(ScopeContext);
  const jacketId = (store?.read("jackets") as Record<string, string> | undefined)?.[pathway];
  const references = (store?.read("references") as Record<string, string> | undefined) ?? {};
  const hasReference = Object.keys(references).some(key => key === pathway || (key.startsWith("crm-next:document-jacket:") && key.includes(`:${pathway}:`)));
  const lookup = packetId ? `/api/crm/v1/contract-packets/${encodeURIComponent(packetId)}` : preserveSavedPacket && (jacketId || hasReference) ? `/api/crm/v1/contract-packets?${new URLSearchParams(jacketId ? { jacketId } : { draftId: store!.draftId(), pathway })}` : "";
  const [loadState, setLoadState] = useState({ url: "", loading: false, error: "" });
  const current = useRef<T | null>(null), sequence = useRef(0);
  const load = useCallback(async (signal?: AbortSignal, force = false) => {
    if (!lookup) return null;
    if (!force && current.current && (!packetId || current.current.packetId === packetId)) return current.current;
    const attempt = ++sequence.current;
    setLoadState({ url: lookup, loading: true, error: "" });
    try {
      const timeout = AbortSignal.timeout(30000);
      const response = await fetch(lookup, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "The saved packet could not be opened. Retry loading it before generating another packet.");
      if (!signal?.aborted && attempt === sequence.current) { current.current = body; setPacket(body); setLoadState({ url: lookup, loading: false, error: "" }); }
      return body as T | null;
    } catch (caught) {
      if (!signal?.aborted && attempt === sequence.current) setLoadState({ url: lookup, loading: false, error: caught instanceof Error && caught.name === "TimeoutError" ? "The saved packet is taking too long to open. Retry loading it; your documents remain saved." : caught instanceof Error ? caught.message : "Connection interrupted while opening the saved packet. Retry loading it." });
      return null;
    }
  }, [lookup, packetId]);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  return [packet, (next) => {
    if (!next && preserveSavedPacket) { setDirty(true); return; }
    sequence.current += 1; current.current = next;
    setPacket(next); setPacketId(next?.packetId ?? ""); setDirty(false);
    if (next?.jacketId) store?.recordJacket(pathway, next.jacketId);
  }, { loading: Boolean(lookup) && !packet && (loadState.url !== lookup || loadState.loading), error: loadState.error, dirty, retry: () => load(undefined, true) }];
}

function fieldEntries(root: HTMLElement) {
  const counts = new Map<string, number>();
  return Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")).flatMap((input) => {
    if (input instanceof HTMLInputElement && (input.readOnly || ["file", "hidden", "password"].includes(input.type))) return [];
    const label = input.closest("label"), name = label?.querySelector("span")?.textContent?.trim() || label?.textContent?.trim();
    if (!name || /SSN|ITIN|social security|credit card number|routing number|bank account/i.test(name)) return [];
    const scope = input.closest<HTMLElement>("[data-deal-draft-scope]")?.dataset.dealDraftScope ?? "desk";
    const base = `${scope}:${name}`, occurrence = counts.get(base) ?? 0;
    counts.set(base, occurrence + 1);
    return [{ input, key: `${base}:${occurrence}` }];
  });
}

export function DealDraftScope({ name, children }: { name: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null), store = useDealDraft();
  useEffect(() => {
    if (!root.current || !store) return;
    const fields = store.read("fields") as Record<string, string | boolean> | undefined;
    for (const { input, key } of fieldEntries(root.current)) {
      const value = fields?.[key];
      if (typeof value === "boolean" && input instanceof HTMLInputElement) input.checked = value;
      else if (typeof value === "string") input.value = value;
    }
  }, [name, store]);
  return <ScopeContext.Provider value={name}><div ref={root} className={styles.scope} data-deal-draft-scope={name}>{children}</div></ScopeContext.Provider>;
}

export function DealDraftWorkspace({ initialCustomerId, initialVehicleFacts, customers, children }: { initialCustomerId?: string; initialVehicleFacts?: Record<string, string>; customers: Array<{ id: string; name: string }>; children: ReactNode }) {
  const snapshot = useRef<Snapshot>({}), id = useRef(""), revision = useRef(0), changes = useRef(0), savedChanges = useRef(0);
  const autoSaveArmed = useRef(false);
  const [persistedId, setPersistedId] = useState("");
  const [entryChoices, setEntryChoices] = useState<DraftSummary[]>([]);
  const initialized = useRef(false), queue = useRef(Promise.resolve()), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), root = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false), [epoch, setEpoch] = useState(0), [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [selectedId, setSelectedId] = useState(""), [message, setMessage] = useState("Loading saved deals..."), [error, setError] = useState(""), [busy, setBusy] = useState(false), [conflict, setConflict] = useState(false);
  const blocked = useRef(false);
  const lastSaveError = useRef("");
  const dealStatus = useRef<SavedDealStatus>("IN_PROGRESS");
  const [currentStatus, setCurrentStatus] = useState<SavedDealStatus>("IN_PROGRESS"), [showLibrary, setShowLibrary] = useState(false);
  const [currentPathway, setCurrentPathway] = useState("retail-sale"), [paperworkComplete, setPaperworkComplete] = useState(false), [packetRefresh, setPacketRefresh] = useState(0);
  const [lifecycle, setLifecycle] = useState<{ action: DealLifecycleAction; deal: { draftId: string; jacketId?: string; customerName: string; pathway: string } } | null>(null);

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init), body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body.error || "Saved deals are unavailable."), { status: response.status });
    return body;
  }
  const refreshList = useCallback(async () => {
    const recent = await request<DraftSummary[]>("/api/crm/v1/deal-drafts");
    setDrafts((current) => {
      const opened = current.find((draft) => draft.id === id.current);
      return opened && !recent.some((draft) => draft.id === opened.id) ? [opened, ...recent] : recent;
    });
  }, []);
  const save = useCallback(async () => {
    let success = false;
    clearTimeout(timer.current);
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (blocked.current) return;
      lastSaveError.current = "";
      setBusy(true); setError(""); setMessage("Saving draft...");
      const number = changes.current, payload = JSON.parse(JSON.stringify(snapshot.current)) as Snapshot;
      const form = payload["desk:form"] as Record<string, string> | undefined;
      const customerId = form?.customerId && form.customerId !== "__manual_customer__" ? form.customerId : "";
      try {
        const draft = await request<Draft>("/api/crm/v1/deal-drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id.current, revision: revision.current, status: dealStatus.current, snapshot: payload, customerId, customerName: customers.find((customer) => customer.id === customerId)?.name || payload["desk:manualCustomerName"] || "Customer not selected", pathway: payload["desk:workflowId"] || "retail-sale", vehicleReference: form?.vehicle || "" }) });
        revision.current = draft.revision; autoSaveArmed.current = true; setPersistedId(draft.id); savedChanges.current = number; setSelectedId(draft.id);
        success = true;
        setDrafts((current) => [draft, ...current.filter((item) => item.id !== draft.id)]);
        setMessage(changes.current === number ? `Draft saved at ${new Date(draft.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Unsaved changes");
      } catch (caught) {
        if ((caught as { status?: number }).status === 409) { blocked.current = true; setConflict(true); }
        lastSaveError.current = caught instanceof Error ? caught.message : "Draft save failed. Your entries remain on this screen.";
        setError(lastSaveError.current); setMessage("Not saved");
      } finally { setBusy(false); }
    });
    await queue.current;
    return success;
  }, [customers]);
  const write = useCallback((key: string, value: unknown) => {
    if (JSON.stringify(snapshot.current[key]) === JSON.stringify(value)) return;
    snapshot.current[key] = value;
    if (key === "desk:workflowId") setCurrentPathway(String(value));
    if (key === "jackets") setPacketRefresh(current => current + 1);
    if (!initialized.current || !autoSaveArmed.current) return;
    changes.current += 1; setMessage("Unsaved changes"); clearTimeout(timer.current);
    if (!blocked.current) timer.current = setTimeout(() => { void save(); }, 1000);
  }, [save]);
  const openLifecycle = useCallback(async (action: DealLifecycleAction) => {
    if (!await save()) return;
    const pathway = String(snapshot.current["desk:workflowId"] || "retail-sale");
    setLifecycle({ action, deal: { draftId: id.current, pathway, customerName: String(customers.find(customer => customer.id === (snapshot.current["desk:form"] as Record<string, string> | undefined)?.customerId)?.name || snapshot.current["desk:manualCustomerName"] || "Selected customer"), jacketId: (snapshot.current.jackets as Record<string, string> | undefined)?.[pathway] } });
  }, [save, customers]);
  const store = useMemo<Store>(() => ({
    read: (key) => snapshot.current[key], write, save, saveError: () => lastSaveError.current, draftId: () => id.current,
    saleStatus: currentStatus, paperworkComplete,
    completeSale: () => openLifecycle(dealStatus.current === "SOLD" ? "FINISH" : "MARK_SOLD"),
    seed: (key, value) => { if (snapshot.current[key] === undefined) snapshot.current[key] = value; },
    recordJacket: (pathway, jacketId) => write("jackets", { ...(snapshot.current.jackets as Record<string, string> ?? {}), [pathway]: jacketId }),
    reference: (key, renew) => {
      const references = snapshot.current.references as Record<string, string> ?? {};
      if (!references[key] || renew) { const value = crypto.randomUUID(); write("references", { ...references, [key]: value }); return value; }
      return references[key];
    }
  }), [write, save, openLifecycle, currentStatus, paperworkComplete]);

  const install = useCallback(async (draft: Draft | null) => {
    initialized.current = false; autoSaveArmed.current = Boolean(draft); setPersistedId(draft?.id ?? ""); setEntryChoices([]); clearTimeout(timer.current);
    const next = draft?.snapshot ?? (initialVehicleFacts ? Object.fromEntries(Object.keys(SALES_DOCUMENT_PATHWAYS).map(pathway => [`${pathway}:vehicleFacts`, { ...initialVehicleFacts }])) : {});
    // Never restore upload readiness from a filename that was not saved to its jacket.
    for (const pathway of Object.keys(SALES_DOCUMENT_PATHWAYS)) {
      const jacketId = (next.jackets as Record<string, string> | undefined)?.[pathway];
      let names = new Set<string>();
      try {
        if (!jacketId) throw new Error("No saved jacket");
        const jacket = await request<{ documents: Array<{ fileName: string; source: string }> }>(`/api/sales-documents/${encodeURIComponent(jacketId)}`);
        names = new Set(jacket.documents.filter((doc) => doc.source !== "GENERATED").map((doc) => doc.fileName));
      } catch { /* Saved terms remain usable; missing uploads must be attached again. */ }
      for (const key of ["paperwork", "packet", "evidence", "documents", "signedDocuments", "releasePhotos", "returnPhotos"]) {
        const values = next[`${pathway}:${key}`];
        if (values && typeof values === "object") next[`${pathway}:${key}`] = Object.fromEntries(Object.entries(values).filter(([, value]) => names.has(String(value))));
      }
    }
    snapshot.current = next; id.current = draft?.id ?? crypto.randomUUID(); revision.current = draft?.revision ?? 0;
    dealStatus.current = draft?.status ?? "IN_PROGRESS"; setCurrentStatus(dealStatus.current);
    setCurrentPathway(String(next["desk:workflowId"] || draft?.pathway || "retail-sale"));
    if (draft) setDrafts((current) => [draft, ...current.filter((item) => item.id !== draft.id)]);
    changes.current = 0; savedChanges.current = 0; blocked.current = false; setConflict(false);
    lastSaveError.current = "";
    setSelectedId(draft?.id ?? ""); setError(""); setMessage(draft ? "Saved deal reopened" : "New draft"); setEpoch((value) => value + 1); setLoaded(true);
    setTimeout(() => { initialized.current = true; }, 0);
  }, [initialVehicleFacts]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await request<DraftSummary[]>(`/api/crm/v1/deal-drafts${initialCustomerId ? `?customerId=${encodeURIComponent(initialCustomerId)}` : ""}`);
        if (!active) return;
        setDrafts(list);
        const params = new URLSearchParams(window.location.search);
        const entry = chooseEntryDraft(list, { draftId: params.get("draftId"), newDeal: params.get("new") === "1", customerId: initialCustomerId, pathway: params.get("pathway") ?? undefined });
        if (entry.candidates.length) { setEntryChoices(entry.candidates); setMessage("Choose which existing deal to continue"); return; }
        const draft = entry.id ? await request<Draft>(`/api/crm/v1/deal-drafts?id=${encodeURIComponent(entry.id)}`) : null;
        if (active) await install(draft);
      } catch (caught) {
        if (!active) return;
        id.current = crypto.randomUUID(); setLoaded(true); initialized.current = true; setMessage("Not saved"); setError(caught instanceof Error ? caught.message : "Saved deals are unavailable.");
      }
    })();
    return () => { active = false; clearTimeout(timer.current); };
  }, [initialCustomerId, install]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (changes.current !== savedChanges.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, []);
  async function openDraft(targetId = selectedId) {
    if (!targetId || busy || (changes.current !== savedChanges.current && !window.confirm("Discard unsaved edits and reopen this saved draft?"))) return;
    clearTimeout(timer.current);
    try { setLoaded(false); await install(await request<Draft>(`/api/crm/v1/deal-drafts?id=${encodeURIComponent(targetId)}`)); }
    catch (caught) { setLoaded(true); setError(caught instanceof Error ? caught.message : "Draft could not be opened."); }
  }
  useEffect(() => {
    const controller = new AbortController();
    const packetId = (snapshot.current.jackets as Record<string, string> | undefined)?.[currentPathway];
    const timer = setTimeout(() => {
      setPaperworkComplete(false);
      if (currentStatus !== "SOLD" || !packetId) return;
      void fetch(`/api/sales-documents/${encodeURIComponent(packetId)}`, { signal: controller.signal }).then(async response => { if (!response.ok) return; const body = await response.json(); if (!controller.signal.aborted) setPaperworkComplete(body.state === "CLOSED" && body.checklist.every((item: { blocker: string | null }) => !item.blocker)); }).catch(() => {});
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [currentStatus, currentPathway, epoch, packetRefresh]);
  useEffect(() => { const refresh = () => setPacketRefresh(value => value + 1); window.addEventListener("focus", refresh); return () => window.removeEventListener("focus", refresh); }, []);
  return <SaveStateContext.Provider value={{ saved: Boolean(persistedId), message }}><DraftContext.Provider value={store}>
    <section className={styles.toolbar} aria-label="Saved deal drafts">
      <div className={styles.commands}><button disabled={!loaded || busy || conflict} onClick={() => void save()}><Save size={16} />Save draft</button><button disabled={!loaded || busy} onClick={() => { if (changes.current !== savedChanges.current && !window.confirm("Start a new deal without saving these edits?")) return; void install(null); }}><Plus size={16} />New deal</button><span role="status">{message}</span></div>
      <details className={overviewStyles.advanced}><summary>Resume another saved deal</summary><div className={styles.commands}><select aria-label="Saved deals" value={selectedId} onFocus={() => void refreshList().catch(() => {})} onChange={(event) => setSelectedId(event.target.value)}><option value="">Choose saved deal</option>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.customerName} · {SALES_DOCUMENT_PATHWAYS[draft.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS] ?? draft.pathway} · {draft.vehicleReference || "Vehicle not assigned"}</option>)}</select><button disabled={!loaded || busy || !selectedId} onClick={() => void openDraft()}><FolderOpen size={16} />Resume</button></div></details>
      <div className={styles.commands}><label>Deal status <select aria-label="Current saved deal status" disabled={!loaded || busy || conflict} value={currentStatus} onChange={(event) => { const value = event.target.value as SavedDealStatus; if (["SOLD", "COMPLETED"].includes(value) && ["SALES", "LEASING"].includes(dealGroup(currentPathway))) { void openLifecycle(currentStatus === "SOLD" ? "FINISH" : "MARK_SOLD"); return; } dealStatus.current = value; setCurrentStatus(value); write("dealStatus", value); }}>{Object.entries(SAVED_DEAL_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{["SALES", "LEASING"].includes(dealGroup(currentPathway)) && !["ARCHIVED", "LOST", "CANCELLED"].includes(currentStatus) && (currentStatus !== "SOLD" ? <button data-completion="pending" disabled={!loaded || busy || conflict} onClick={() => void openLifecycle("MARK_SOLD")}>Mark sold</button> : paperworkComplete ? <span className={styles.badge} data-finalized="true">Sold · finalized</span> : <button data-completion="pending" disabled={!loaded || busy || conflict} onClick={() => void openLifecycle("FINISH")}>Sold · complete paperwork</button>)}<button aria-expanded={showLibrary} onClick={() => setShowLibrary((value) => !value)}><FolderOpen size={16} />Saved deals</button></div>
      {error ? <p role="alert">{error}{conflict ? <button onClick={() => { id.current = crypto.randomUUID(); revision.current = 0; blocked.current = false; setConflict(false); void save(); }}>Save as new draft</button> : null}</p> : null}
    </section>
    {entryChoices.length > 0 && <section className={overviewStyles.panel} aria-label="Choose customer deal"><h2>Choose the deal to continue</h2><p>This customer has several active deals. Choose the correct vehicle and pathway, or explicitly start a separate deal.</p><div className={overviewStyles.entry}>{entryChoices.map(draft => <button key={draft.id} disabled={busy} onClick={() => void openDraft(draft.id)} type="button"><strong>{draft.customerName} · {SALES_DOCUMENT_PATHWAYS[draft.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS]}</strong><small>{draft.vehicleReference || "Vehicle not assigned"} · {draft.status ? SAVED_DEAL_STATUSES[draft.status] : "Working"} · Updated {new Date(draft.updatedAt).toLocaleString()}</small></button>)}</div><button onClick={() => void install(null)} type="button">Start a separate deal for this customer</button></section>}
    {lifecycle && <DealLifecycleDialog {...lifecycle} onClose={() => setLifecycle(null)} onSaved={text => { setLifecycle(null); void request<Draft>(`/api/crm/v1/deal-drafts?id=${encodeURIComponent(id.current)}`).then(async draft => { await install(draft); setMessage(text); }).catch(caught => setError(caught instanceof Error ? caught.message : "Refresh this saved deal to see its updated status.")); }} />}
    {showLibrary ? <SavedDealsLibrary disabled={!loaded || busy} onOpen={(targetId) => void openDraft(targetId)} refreshKey={drafts.map((draft) => `${draft.id}:${draft.updatedAt}`).join("|")} /> : null}
    <fieldset className={styles.body} disabled={!loaded}><div ref={root} key={epoch} onChangeCapture={(event) => {
      if (!root.current || !initialized.current) return;
      const item = fieldEntries(root.current).find(({ input }) => input === event.target);
      if (item) { autoSaveArmed.current = true; write("fields", { ...(snapshot.current.fields as Record<string, unknown> ?? {}), [item.key]: item.input instanceof HTMLInputElement && ["checkbox", "radio"].includes(item.input.type) ? item.input.checked : item.input.value }); }
    }}><DealDraftScope name="desk">{children}</DealDraftScope></div></fieldset>
  </DraftContext.Provider></SaveStateContext.Provider>;
}
