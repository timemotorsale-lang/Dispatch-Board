import type { AuthenticatedUser } from "@/server/auth/store";
import { getServiceAdvisorWorkspace, type ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";
import { getInventoryConsoleOperationalFacts } from "@/server/inventory-console-home";
import { buildInventoryPriorityWork } from "@/server/inventory-console-home/priority-work";
import { getInventoryControlTowerProjection } from "@/server/inventory-control-tower";
import { getInventoryGovernanceConsole } from "@/server/inventory-governance/service";
import { assertAuthenticatedUser, isGeneralManager, isManager } from "@/server/policies/access";
import type { BoardReadTask } from "@/server/services/board-read";
import { getMyTasksViewModelForToday } from "@/server/services/my-tasks";

export type ManagerMode = "CEO" | "COO" | "WORK";
export type ManagerWorkHat = "ADVISOR" | "DETAIL" | "INVENTORY" | "LOT" | "PARTS" | "TECHNICIAN";
export type ManagerAction = { action: string; authority: string; dueAt: string; hat: ManagerWorkHat; href: string; id: string; mode: ManagerMode; overdue: boolean; reason: string; score: number; subject: string; title: string };
export type ManagerInboxItem = { audience: "CUSTOMER" | "MANAGEMENT" | "TEAM"; href: string; id: string; needsResponse: boolean; preview: string; subject: string };

export type ManagerWorkspaceModel = {
  generatedAt: string;
  user: { id: string; name: string; canUseCeo: boolean; canUseCoo: boolean };
  health: { activeInventory: number; activeRepairOrders: number; advisorAttention: number; agedExposureCents: number; approvals: number; blocked: number; exposureCents: number; failedCommands: number; inbox: number; overdue: number; reviews: number; waitingParts: number };
  actions: ManagerAction[];
  inbox: ManagerInboxItem[];
  hats: Array<{ id: ManagerWorkHat; count: number }>;
  sources: { advisor: boolean; governance: boolean; inventory: boolean; operations: boolean; tasks: boolean };
};

function taskHat(task: BoardReadTask): ManagerWorkHat {
  const text = `${task.title} ${task.description ?? ""} ${task.workflowArea}`.toLowerCase();
  if (/customer|appointment|advisor|authorization|call|handoff/.test(text)) return "ADVISOR";
  if (/part|pickup|pick up|return|vendor/.test(text)) return "PARTS";
  if (/detail|wash|clean|photo|merchandis/.test(text)) return "DETAIL";
  if (/lot|move|movement|key|transport|park/.test(text)) return "LOT";
  if (/technician|mechanic|repair|diagnos|inspect/.test(text)) return "TECHNICIAN";
  return "INVENTORY";
}
function advisorAction(kind: ServiceAdvisorWorkspaceModel["actionQueue"][number]["actionKind"]) {
  if (kind === "AUTHORIZATION") return "Record decision";
  if (kind === "PROMISE_RISK") return "Protect promise";
  if (kind === "PARTS_DELAY") return "Check ETA";
  if (kind === "HANDOFF") return "Prepare handoff";
  if (kind === "TECHNICIAN_CLARIFICATION") return "Get clarification";
  return "Update customer";
}
function taskScore(task: BoardReadTask, now: Date) {
  const overdue = new Date(task.dueAt) < now, priority = task.priority.toUpperCase();
  return (overdue ? 500 : 0) + (priority === "URGENT" || priority === "CRITICAL" ? 400 : priority === "HIGH" ? 300 : priority === "MEDIUM" ? 200 : 100);
}

export async function getManagerWorkspace(actor: AuthenticatedUser | null): Promise<ManagerWorkspaceModel> {
  const user = assertAuthenticatedUser(actor);
  if (!isManager(user)) throw new Error("Manager Workspace requires manager privileges.");
  const now = new Date();
  const [inventoryResult, governanceResult, advisorResult, tasksResult] = await Promise.allSettled([
    getInventoryControlTowerProjection(user), getInventoryGovernanceConsole(user), getServiceAdvisorWorkspace(user), getMyTasksViewModelForToday(user)
  ]);
  const inventory = inventoryResult.status === "fulfilled" ? inventoryResult.value : null;
  const governance = governanceResult.status === "fulfilled" ? governanceResult.value : null;
  const advisor = advisorResult.status === "fulfilled" ? advisorResult.value : null;
  const tasks = tasksResult.status === "fulfilled" ? tasksResult.value.tasks : [];
  const operations = inventory ? await getInventoryConsoleOperationalFacts({ locationId: inventory.filters.locationId }).catch(() => null) : null;
  const returnTo = "/manager-workspace?mode=work";

  const governanceActions: ManagerAction[] = [...(governance?.approvals ?? []), ...(governance?.reviews ?? [])].map(item => ({
    action: item.actionLabel, authority: item.kind === "APPROVAL" ? "CEO / authorized manager" : "COO / manager review", dueAt: item.dueAt,
    hat: "INVENTORY", href: item.actionHref, id: `governance:${item.id}`, mode: item.kind === "APPROVAL" ? "CEO" : "COO", overdue: item.overdue,
    reason: `${item.domain.replaceAll("_", " ")} · ${item.state.replaceAll("_", " ")}`, score: (item.overdue ? 1200 : 700) + (item.kind === "APPROVAL" ? 300 : 100), subject: item.subject, title: item.title
  }));
  const inventoryExceptions = inventory ? buildInventoryPriorityWork(inventory.items, user.id, "ALL", now) : [];
  const inventoryActions: ManagerAction[] = inventoryExceptions.map(item => ({ action: item.nextAction, authority: item.queue === "MY" ? "Assigned owner" : "COO intervention", dueAt: item.dueAt, hat: "INVENTORY", href: `/vehicles/control-tower?inventoryUnitId=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(returnTo)}`, id: `inventory:${item.id}`, mode: item.queue === "MY" ? "WORK" : "COO", overdue: item.overdue, reason: item.issue, score: (item.overdue ? 950 : 500) + (item.tier === "P0" ? 400 : item.tier === "P1" ? 250 : 100), subject: `${item.vehicle} · ${item.inventoryNumber}`, title: `${item.reasonCode.toLowerCase()} inventory` }));
  const advisorActions: ManagerAction[] = (advisor?.actionQueue ?? []).map(item => ({ action: advisorAction(item.actionKind), authority: ["AUTHORIZATION", "PROMISE_RISK"].includes(item.actionKind) ? "Service Advisor / manager escalation" : "Service Advisor", dueAt: item.targetAt, hat: "ADVISOR", href: `/vehicles/repair-workbench?${new URLSearchParams({ repairOrderId: item.id, workspace: "advisor", returnTo })}`, id: `advisor:${item.id}`, mode: ["AUTHORIZATION", "PROMISE_RISK"].includes(item.actionKind) ? "COO" : "WORK", overdue: item.overdue, reason: item.actionReason, score: (item.overdue ? 1000 : 500) + (["AUTHORIZATION", "PROMISE_RISK"].includes(item.actionKind) ? 300 : 100), subject: `${item.customerName} · ${item.repairOrderNumber}`, title: item.actionLabel }));
  const taskActions: ManagerAction[] = tasks.filter(task => !["DONE", "COMPLETED", "CANCELLED"].includes(task.status.toUpperCase())).map(task => ({ action: task.status === "READY_FOR_REVIEW" ? "Review task" : "Open task", authority: "Assigned staff authority", dueAt: task.dueAt, hat: taskHat(task), href: `/tasks/${encodeURIComponent(task.id)}?returnTo=${encodeURIComponent(returnTo)}`, id: `task:${task.id}`, mode: "WORK", overdue: new Date(task.dueAt) < now, reason: task.blockerReason ?? task.description ?? "Complete the assigned next action.", score: taskScore(task, now), subject: task.vehicleReference ?? task.customerReference ?? task.workflowArea.replaceAll("_", " "), title: task.title }));
  const actions = [...governanceActions, ...inventoryActions, ...advisorActions, ...taskActions].sort((a, b) => b.score - a.score || a.dueAt.localeCompare(b.dueAt));

  const inbox: ManagerInboxItem[] = [
    ...(advisor?.inbox ?? []).filter(item => item.needsResponse).map(item => ({ audience: item.audience, href: `/vehicles/repair-workbench?${new URLSearchParams({ repairOrderId: item.repairOrderId, workspace: "advisor", returnTo })}`, id: `advisor-inbox:${item.id}`, needsResponse: true, preview: item.preview, subject: `${item.subject} · ${item.customerName}` })),
    ...(governance?.approvals ?? []).slice(0, 8).map(item => ({ audience: "MANAGEMENT" as const, href: item.actionHref, id: `approval-inbox:${item.id}`, needsResponse: true, preview: `${item.owner} submitted ${item.domain.replaceAll("_", " ").toLowerCase()} for an authorized decision.`, subject: item.title })),
    ...tasks.filter(task => Boolean(task.blockerReason)).slice(0, 8).map(task => ({ audience: "TEAM" as const, href: `/tasks/${encodeURIComponent(task.id)}?returnTo=${encodeURIComponent(returnTo)}`, id: `task-inbox:${task.id}`, needsResponse: true, preview: task.blockerReason ?? "A team blocker needs attention.", subject: task.title }))
  ].slice(0, 30);
  const hats = (["ADVISOR", "INVENTORY", "TECHNICIAN", "LOT", "PARTS", "DETAIL"] as ManagerWorkHat[]).map(id => ({ id, count: actions.filter(item => item.mode === "WORK" && item.hat === id).length }));
  const agedExposureCents = inventory?.agingBands.filter(band => ["31_45", "46_60", "61_plus"].includes(band.key)).reduce((sum, band) => sum + band.exposureCents, 0) ?? 0;
  return { generatedAt: now.toISOString(), user: { id: user.id, name: user.name, canUseCeo: isGeneralManager(user), canUseCoo: isManager(user) }, health: { activeInventory: inventory?.totals.units ?? 0, activeRepairOrders: advisor?.counts.activeRepairOrders ?? 0, advisorAttention: advisor?.counts.needsAttention ?? 0, agedExposureCents, approvals: governance?.totals.approvals ?? 0, blocked: inventory?.totals.blocked ?? 0, exposureCents: inventory?.totals.exposureCents ?? 0, failedCommands: governance?.totals.failedCommands ?? 0, inbox: inbox.length, overdue: inventory?.totals.overdue ?? 0, reviews: governance?.totals.reviews ?? 0, waitingParts: inventory?.crossLane.waitingPartDemands ?? operations?.parts.waitingDemands ?? 0 }, actions, inbox, hats, sources: { advisor: Boolean(advisor), governance: Boolean(governance), inventory: Boolean(inventory), operations: Boolean(operations), tasks: tasksResult.status === "fulfilled" } };
}
