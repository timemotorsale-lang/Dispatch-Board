import type { InventoryConsoleWorkView } from "@/server/inventory-console-saved-views";

type PrioritySource = { id: string; inventoryNumber: string; operatingState: string; targetAt: Date; nextAction: string; stateReason: string | null; financialAcquiredAt: Date; ownerUser: { id: string; name: string }; vehicle: { vehicleNumber: string; year: number | null; make: string | null; model: string | null } };
export type InventoryPriorityWorkItem = { ageDays: number; dueAt: string; escalated: boolean; id: string; inventoryNumber: string; issue: string; nextAction: string; owner: string; ownerUserId: string; overdue: boolean; queue: "MY" | "TEAM"; reasonCode: "BLOCKED" | "OVERDUE" | "WAITING"; state: string; tier: "P0" | "P1" | "P2"; vehicle: string };

export function buildInventoryPriorityWork(items: PrioritySource[], actorUserId: string, view: InventoryConsoleWorkView, now: Date): InventoryPriorityWorkItem[] {
  const unique = [...new Map(items.map(item => [item.id, item])).values()];
  return unique.flatMap<InventoryPriorityWorkItem>(item => {
    const overdue = item.targetAt < now && item.operatingState !== "CLOSED", blocked = item.operatingState === "BLOCKED", waiting = item.operatingState === "WAITING";
    if (!blocked && !overdue && !waiting) return [];
    if (view === "MY" && item.ownerUser.id !== actorUserId) return [];
    if (view === "BLOCKED" && !blocked) return [];
    if (view === "OVERDUE" && !overdue) return [];
    const reasonCode = blocked ? "BLOCKED" as const : overdue ? "OVERDUE" as const : "WAITING" as const;
    return [{ ageDays: Math.max(0, Math.floor((now.getTime() - item.financialAcquiredAt.getTime()) / 86_400_000)), dueAt: item.targetAt.toISOString(), escalated: blocked || overdue, id: item.id, inventoryNumber: item.inventoryNumber, issue: item.stateReason ?? item.nextAction, nextAction: item.nextAction, owner: item.ownerUser.name, ownerUserId: item.ownerUser.id, overdue, queue: item.ownerUser.id === actorUserId ? "MY" : "TEAM", reasonCode, state: item.operatingState, tier: blocked ? "P0" : overdue ? "P1" : "P2", vehicle: [item.vehicle.year, item.vehicle.make, item.vehicle.model].filter(Boolean).join(" ") || item.vehicle.vehicleNumber }];
  }).sort((left, right) => left.tier.localeCompare(right.tier) || left.dueAt.localeCompare(right.dueAt) || left.id.localeCompare(right.id));
}
