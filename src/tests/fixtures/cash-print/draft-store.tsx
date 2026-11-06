import { useCallback, useState, type SetStateAction } from "react";
import type { UnifiedCrmContractPacketResult } from "@/server/unified-crm/contract-packet-contract";
export const fixture = { snapshot: {} as Record<string, unknown>, failSave: false, saveCalls: 0 };
const store = {
  draftId: () => "fictional-draft",
  read: (key: string) => fixture.snapshot[key],
  saleStatus: "SOLD", paperworkComplete: false, completeSale: async () => {}, recordJacket: () => {},
  saveError: () => "Fixture save unavailable; entered details are retained.",
  save: async () => { fixture.saveCalls++; return !fixture.failSave; }
};
export function useDealDraft() { return store; }
export function useDealDraftState<T>(name: string, initial: T | (() => T)): [T, (value: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    const defaults = typeof initial === "function" ? (initial as () => T)() : initial;
    const saved = fixture.snapshot[name];
    const restored = saved === undefined ? defaults : defaults && typeof defaults === "object" && !Array.isArray(defaults) ? { ...defaults, ...saved as object } as T : saved as T;
    fixture.snapshot[name] = restored; return restored;
  });
  const update = useCallback((action: SetStateAction<T>) => {
    const next = typeof action === "function" ? (action as (current: T) => T)(fixture.snapshot[name] as T) : action;
    fixture.snapshot[name] = next; setValue(next);
  }, [name]);
  return [value, update];
}
export function useArchivedDealPacket<T extends UnifiedCrmContractPacketResult>(): [T | null, (value: T | null) => void, { loading: boolean; error: string; dirty: boolean; retry: () => Promise<T | null> }] {
  const [packet, setPacket] = useState<T | null>(null);
  return [packet, setPacket, { loading: false, error: "", dirty: false, retry: async () => packet }];
}
