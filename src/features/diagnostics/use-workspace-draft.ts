"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SavedWorkspaceDraft<T> = { id: string; version: number; title: string; content: T };
export function workspaceDraftNeedsNavigationSave(content: object, copyBaseline: string | null) {
  return copyBaseline === null || JSON.stringify(content) !== copyBaseline;
}

export function useWorkspaceDraft<T extends object>(content: T, title: string) {
  const identity = useRef({ id: "", version: 0, saved: "" });
  const copyRequest = useRef<{ id: string; content: string } | null>(null);
  const [savedId, setSavedId] = useState<string>();
  const pending = useRef<Promise<boolean> | null>(null);
  const latest = useRef({ content, title });
  const [status, setStatus] = useState("Not saved");
  const [drafts, setDrafts] = useState<SavedWorkspaceDraft<T>[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  const serialized = JSON.stringify(content);
  const initial = useRef(serialized);
  const copyBaseline = useRef<string | null>(null);
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
      setSavedId(undefined);
      setStatus("Not saved");
    }
    return true;
  }, []);
  const save = useCallback(async (override?: T, copyTitle?: string): Promise<boolean> => {
    while (pending.current) { if (!await pending.current) return false; }
    const snapshot = override ? { ...latest.current, content: override } : latest.current;
    const json = JSON.stringify(snapshot.content);
    if (copyTitle === undefined && identity.current.saved === json) return true;
    let requestIdentity = { ...identity.current };
    if (copyTitle !== undefined) {
      const fingerprint = JSON.stringify([copyTitle, json]);
      if (copyRequest.current?.content !== fingerprint) copyRequest.current = { id: crypto.randomUUID(), content: fingerprint };
      requestIdentity = { id: copyRequest.current.id, version: 0, saved: "" };
    } else if (!requestIdentity.id) {
      requestIdentity.id = crypto.randomUUID();
      identity.current = requestIdentity;
    }
    setStatus("Saving…");
    const work = (async () => {
      try {
        const response = await fetch("/api/diagnostics/workspace-drafts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: requestIdentity.id, version: requestIdentity.version, title: copyTitle ?? snapshot.title, content: snapshot.content }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Draft save failed.");
        identity.current = { id: requestIdentity.id, version: result.version, saved: json };
        if (copyTitle !== undefined) latest.current = { content: snapshot.content, title: copyTitle };
        setSavedId(requestIdentity.id);
        copyRequest.current = null;
        copyBaseline.current = null;
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
  function adopt(draft?: SavedWorkspaceDraft<T>, unsavedCopy?: T) {
    copyBaseline.current = unsavedCopy ? JSON.stringify(unsavedCopy) : null;
    initial.current = draft ? JSON.stringify(draft.content) : copyBaseline.current ?? JSON.stringify(latest.current.content);
    identity.current = draft ? { id: draft.id, version: draft.version, saved: JSON.stringify(draft.content) } : { id: "", version: 0, saved: "" };
    copyRequest.current = null;
    setSavedId(draft?.id);
    setStatus(draft ? "Saved" : "Not saved");
    setDrafts([]);
    setDraftsLoaded(false);
  }
  async function saveAndGetId(override?: T) {
    return await save(override) ? identity.current.id : null;
  }
  async function saveCopy(nextContent = content, nextTitle = title) {
    while (pending.current) await pending.current;
    return await save(nextContent, nextTitle) ? identity.current.id : null;
  }
  function saveBeforeNavigation() {
    return workspaceDraftNeedsNavigationSave(content, copyBaseline.current) ? save() : Promise.resolve(true);
  }
  return { save, saveAndGetId, savedId, saveBeforeNavigation, saveCopy, refresh, archiveDraft, drafts, draftsLoaded, adopt, status, saving: status === "Saving…" };
}
