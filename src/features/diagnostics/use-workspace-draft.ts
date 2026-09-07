"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SavedWorkspaceDraft<T> = { id: string; version: number; title: string; content: T };
export function useWorkspaceDraft<T extends object>(content: T, title: string) {
  const identity = useRef({ id: "", version: 0, saved: "" });
  const pending = useRef<Promise<boolean> | null>(null);
  const latest = useRef({ content, title });
  const [status, setStatus] = useState("Not saved");
  const [drafts, setDrafts] = useState<SavedWorkspaceDraft<T>[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  const serialized = JSON.stringify(content);
  const initial = useRef(serialized);
  useEffect(() => { latest.current = { content, title }; }, [content, title]);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/diagnostics/workspace-drafts", { cache: "no-store" });
    if (!response.ok) throw new Error("Saved drafts could not load.");
    const values = (await response.json()).drafts as SavedWorkspaceDraft<T>[];
    setDrafts(values);
    setDraftsLoaded(true);
    return values;
  }, []);
  const archiveDraft = useCallback(async (id: string) => {
    const response = await fetch(`/api/diagnostics/workspace-drafts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Saved quote could not be archived.");
    setDrafts(values => values.filter(draft => draft.id !== id));
    setDraftsLoaded(true);
    if (identity.current.id === id) {
      identity.current = { id: "", version: 0, saved: "" };
      setStatus("Not saved");
    }
    return true;
  }, []);
  const save = useCallback(async (override?: T): Promise<boolean> => {
    while (pending.current) { if (!await pending.current) return false; }
    const snapshot = override ? { ...latest.current, content: override } : latest.current;
    const json = JSON.stringify(snapshot.content);
    if (identity.current.saved === json) return true;
    if (!identity.current.id) identity.current.id = crypto.randomUUID();
    const requestIdentity = { ...identity.current };
    setStatus("Saving…");
    const work = (async () => {
      try {
        const response = await fetch("/api/diagnostics/workspace-drafts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: requestIdentity.id, version: requestIdentity.version, title: snapshot.title, content: snapshot.content }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Draft save failed.");
        identity.current = { id: requestIdentity.id, version: result.version, saved: json };
        setStatus("Saved");
        setRevision(value => value + 1);
        return true;
      } catch (error) { setStatus(error instanceof Error ? error.message : "Draft save failed."); return false; }
      finally { pending.current = null; }
    })();
    pending.current = work;
    return work;
  }, []);
  useEffect(() => {
    if (!identity.current.id || serialized === identity.current.saved) return;
    const timer = setTimeout(() => { void save(); }, 1200);
    return () => clearTimeout(timer);
  }, [serialized, revision, save]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (serialized !== (identity.current.id ? identity.current.saved : initial.current)) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [serialized]);
  function adopt(draft?: SavedWorkspaceDraft<T>) {
    initial.current = draft ? JSON.stringify(draft.content) : JSON.stringify(latest.current.content);
    identity.current = draft ? { id: draft.id, version: draft.version, saved: JSON.stringify(draft.content) } : { id: "", version: 0, saved: "" };
    setStatus(draft ? "Saved" : "Not saved");
    setDrafts([]);
    setDraftsLoaded(false);
  }
  async function saveCopy() {
    while (pending.current) await pending.current;
    identity.current = { id: "", version: 0, saved: "" };
    return save();
  }
  return { save, saveCopy, refresh, archiveDraft, drafts, draftsLoaded, adopt, status, saving: status === "Saving…" };
}
