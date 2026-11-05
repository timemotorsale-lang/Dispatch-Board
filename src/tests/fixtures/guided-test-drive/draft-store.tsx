import { useCallback, useState, useSyncExternalStore, type SetStateAction } from "react";
type Snapshot = Record<string, unknown>;
export const fixtureState = { snapshot: JSON.parse(localStorage.getItem("guided-drive-fixture") ?? "{}") as Snapshot, busy: false, dirty: false, error: "", failSave: false, failStatus: false, version: 0 };
const listeners = new Set<() => void>();
const notify = () => { fixtureState.version++; listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const store = {
  read: (key: string) => fixtureState.snapshot[key],
  draftId: () => "fixture-draft",
  saveError: () => fixtureState.error,
  recordJacket: () => {},
  reference: (key: string) => {
    const references = (fixtureState.snapshot.references ?? {}) as Record<string, string>;
    references[key] ??= crypto.randomUUID(); fixtureState.snapshot.references = references; return references[key];
  },
  save: async () => {
    fixtureState.busy = true; notify();
    await new Promise(resolve => setTimeout(resolve, 30));
    fixtureState.busy = false;
    if (fixtureState.failSave) { fixtureState.error = "Fixture save failed; entries retained."; notify(); return false; }
    localStorage.setItem("guided-drive-fixture", JSON.stringify(fixtureState.snapshot));
    fixtureState.error = ""; fixtureState.dirty = false; notify(); return true;
  }
};
export function useDealDraft() { return store; }
export function useDealSaveState() {
  useSyncExternalStore(subscribe, () => fixtureState.version);
  return { saved: true, busy: fixtureState.busy, dirty: fixtureState.dirty };
}
export function useDealDraftState<T>(key: string, initial: T): [T, (value: SetStateAction<T>) => void] {
  const name = `test-drive:${key}`;
  const [value, setValue] = useState<T>(() => {
    const existing = fixtureState.snapshot[name];
    const restored = typeof initial === "object" && initial ? { ...initial, ...(existing as object ?? {}) } as T : existing === undefined ? initial : existing as T;
    fixtureState.snapshot[name] = restored; return restored;
  });
  const update = useCallback((action: SetStateAction<T>) => {
    const previous = fixtureState.snapshot[name] as T;
    const next = typeof action === "function" ? (action as (current: T) => T)(previous) : action;
    fixtureState.snapshot[name] = next; fixtureState.dirty = true; setValue(next); notify();
  }, [name]);
  return [value, update];
}
