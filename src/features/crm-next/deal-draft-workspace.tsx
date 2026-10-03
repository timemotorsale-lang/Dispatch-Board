"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction, type Dispatch } from "react";
import { Save, FolderOpen, Plus } from "lucide-react";
import { SALES_DOCUMENT_PATHWAYS } from "@/lib/sales-document-pathways";
import styles from "./deal-draft-workspace.module.css";

type Snapshot = Record<string, unknown>;
type DraftSummary = { id: string; customerName: string; pathway: string; vehicleReference: string; updatedAt: string };
type Draft = DraftSummary & { revision: number; snapshot: Snapshot };
type Store = {
  read: (key: string) => unknown;
  write: (key: string, value: unknown) => void;
  seed: (key: string, value: unknown) => void;
  save: () => Promise<boolean>;
  recordJacket: (pathway: string, id: string) => void;
  reference: (key: string, renew?: boolean) => string;
};
const DraftContext = createContext<Store | null>(null);
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

export function useArchivedDealPacket<T extends { packetId: string; jacketId?: string }>(): [T | null, (packet: T | null) => void] {
  const [packetId, setPacketId] = useDealDraftState("generatedPacketId", "");
  const [packet, setPacket] = useState<T | null>(null);
  const store = useDealDraft(), pathway = useContext(ScopeContext);
  useEffect(() => {
    if (!packetId) return;
    const controller = new AbortController();
    void fetch(`/api/crm/v1/contract-packets/${encodeURIComponent(packetId)}`, { signal: controller.signal }).then(async (response) => {
      if (response.ok && !controller.signal.aborted) setPacket(await response.json());
    }).catch(() => {});
    return () => controller.abort();
  }, [packetId]);
  return [packet, (next) => {
    setPacket(next); setPacketId(next?.packetId ?? "");
    if (next?.jacketId) store?.recordJacket(pathway, next.jacketId);
  }];
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

export function DealDraftWorkspace({ initialCustomerId, customers, children }: { initialCustomerId?: string; customers: Array<{ id: string; name: string }>; children: ReactNode }) {
  const snapshot = useRef<Snapshot>({}), id = useRef(""), revision = useRef(0), changes = useRef(0), savedChanges = useRef(0);
  const initialized = useRef(false), queue = useRef(Promise.resolve()), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), root = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false), [epoch, setEpoch] = useState(0), [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [selectedId, setSelectedId] = useState(""), [message, setMessage] = useState("Loading saved deals..."), [error, setError] = useState(""), [busy, setBusy] = useState(false), [conflict, setConflict] = useState(false);
  const blocked = useRef(false);

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init), body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body.error || "Saved deals are unavailable."), { status: response.status });
    return body;
  }
  const refreshList = useCallback(async () => {
    setDrafts(await request<DraftSummary[]>("/api/crm/v1/deal-drafts"));
  }, []);
  const save = useCallback(async () => {
    let success = false;
    clearTimeout(timer.current);
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (blocked.current) return;
      setBusy(true); setError(""); setMessage("Saving draft...");
      const number = changes.current, payload = JSON.parse(JSON.stringify(snapshot.current)) as Snapshot;
      const form = payload["desk:form"] as Record<string, string> | undefined;
      const customerId = form?.customerId && form.customerId !== "__manual_customer__" ? form.customerId : "";
      try {
        const draft = await request<Draft>("/api/crm/v1/deal-drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id.current, revision: revision.current, snapshot: payload, customerId, customerName: customers.find((customer) => customer.id === customerId)?.name || payload["desk:manualCustomerName"] || "Customer not selected", pathway: payload["desk:workflowId"] || "retail-sale", vehicleReference: form?.vehicle || "" }) });
        revision.current = draft.revision; savedChanges.current = number; setSelectedId(draft.id);
        success = true;
        setDrafts((current) => [draft, ...current.filter((item) => item.id !== draft.id)]);
        setMessage(changes.current === number ? `Draft saved at ${new Date(draft.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Unsaved changes");
      } catch (caught) {
        if ((caught as { status?: number }).status === 409) { blocked.current = true; setConflict(true); }
        setError(caught instanceof Error ? caught.message : "Draft save failed. Your entries remain on this screen."); setMessage("Not saved");
      } finally { setBusy(false); }
    });
    await queue.current;
    return success;
  }, [customers]);
  const write = useCallback((key: string, value: unknown) => {
    if (JSON.stringify(snapshot.current[key]) === JSON.stringify(value)) return;
    snapshot.current[key] = value;
    if (!initialized.current) return;
    changes.current += 1; setMessage("Unsaved changes"); clearTimeout(timer.current);
    if (!blocked.current) timer.current = setTimeout(() => { void save(); }, 1000);
  }, [save]);
  const store = useMemo<Store>(() => ({
    read: (key) => snapshot.current[key], write, save,
    seed: (key, value) => { if (snapshot.current[key] === undefined) snapshot.current[key] = value; },
    recordJacket: (pathway, jacketId) => write("jackets", { ...(snapshot.current.jackets as Record<string, string> ?? {}), [pathway]: jacketId }),
    reference: (key, renew) => {
      const references = snapshot.current.references as Record<string, string> ?? {};
      if (!references[key] || renew) { const value = crypto.randomUUID(); write("references", { ...references, [key]: value }); return value; }
      return references[key];
    }
  }), [write, save]);

  const install = useCallback(async (draft: Draft | null) => {
    initialized.current = false; clearTimeout(timer.current);
    const next = draft?.snapshot ?? {};
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
    changes.current = 0; savedChanges.current = 0; blocked.current = false; setConflict(false);
    setSelectedId(draft?.id ?? ""); setError(""); setMessage(draft ? "Saved deal reopened" : "New draft"); setEpoch((value) => value + 1); setLoaded(true);
    setTimeout(() => { initialized.current = true; }, 0);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await request<DraftSummary[]>("/api/crm/v1/deal-drafts");
        if (!active) return;
        setDrafts(list);
        const preferred = initialCustomerId ? list.find((item) => (item as DraftSummary & { customerId?: string }).customerId === initialCustomerId) : list[0];
        const draft = preferred ? await request<Draft>(`/api/crm/v1/deal-drafts?id=${encodeURIComponent(preferred.id)}`) : null;
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
  async function openDraft() {
    if (!selectedId || busy || (changes.current !== savedChanges.current && !window.confirm("Discard unsaved edits and reopen this saved draft?"))) return;
    clearTimeout(timer.current);
    try { setLoaded(false); await install(await request<Draft>(`/api/crm/v1/deal-drafts?id=${encodeURIComponent(selectedId)}`)); }
    catch (caught) { setLoaded(true); setError(caught instanceof Error ? caught.message : "Draft could not be opened."); }
  }
  return <DraftContext.Provider value={store}>
    <section className={styles.toolbar} aria-label="Saved deal drafts">
      <div className={styles.commands}><button disabled={!loaded || busy || conflict} onClick={() => void save()}><Save size={16} />Save draft</button><button disabled={!loaded || busy} onClick={() => { if (changes.current !== savedChanges.current && !window.confirm("Start a new deal without saving these edits?")) return; void install(null); }}><Plus size={16} />New deal</button><span role="status">{message}</span></div>
      <div className={styles.commands}><select aria-label="Saved deals" value={selectedId} onFocus={() => void refreshList().catch(() => {})} onChange={(event) => setSelectedId(event.target.value)}><option value="">Choose saved deal</option>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.customerName} · {SALES_DOCUMENT_PATHWAYS[draft.pathway as keyof typeof SALES_DOCUMENT_PATHWAYS] ?? draft.pathway} · {draft.vehicleReference || "Vehicle not assigned"}</option>)}</select><button disabled={!loaded || busy || !selectedId} onClick={() => void openDraft()}><FolderOpen size={16} />Resume</button></div>
      {error ? <p role="alert">{error}{conflict ? <button onClick={() => { id.current = crypto.randomUUID(); revision.current = 0; blocked.current = false; setConflict(false); void save(); }}>Save as new draft</button> : null}</p> : null}
    </section>
    <fieldset className={styles.body} disabled={!loaded}><div ref={root} key={epoch} onChangeCapture={(event) => {
      if (!root.current || !initialized.current) return;
      const item = fieldEntries(root.current).find(({ input }) => input === event.target);
      if (item) write("fields", { ...(snapshot.current.fields as Record<string, unknown> ?? {}), [item.key]: item.input instanceof HTMLInputElement && ["checkbox", "radio"].includes(item.input.type) ? item.input.checked : item.input.value });
    }}><DealDraftScope name="desk">{children}</DealDraftScope></div></fieldset>
  </DraftContext.Provider>;
}
