import type { AuthenticatedUser } from "@/server/auth/store";
import { createBoardReadRepository } from "@/server/repositories/board-read-repository";
import { createStaffDayRepository } from "@/server/repositories/staff-day-repository";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";
import { currentWorkdayBoardDate, getCooWorkbook, getStaffWorkbook, getStaffWorkbookSummaries } from "@/server/services/workday-workbook";
import { getWorkspaceDefinition, getWorkspaceKey, getWorkspaceWorkbookLabel, type WorkspaceKey } from "@/server/auth/navigation";
import { prisma } from "@/server/db/client";
import { isManager } from "@/server/policies/access";
import { normalizeBoardDate } from "@/server/validation/board-date";

type AdvisorActionKind = "AUTHORIZATION" | "PROMISE_RISK" | "PARTS_DELAY" | "CUSTOMER_UPDATE" | "HANDOFF" | "FOLLOW_UP_SCHEDULED" | "TECHNICIAN_CLARIFICATION";
type MorningPrioritySourceType = "APPOINTMENT" | "DUTY" | "REPAIR_ORDER" | "TASK";
type WorkbookSearchHistoryItem = {
  action: string;
  context: string;
  description: string;
  href: string;
  id: string;
  kind: string;
  resume?: {
    boardDate: string;
    description: string;
    id: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    source: "checklist" | "focus" | "quick" | "reportSeed";
    title: string;
    workflowArea: "ADMIN" | "COLLECTIONS" | "GENERAL_MANAGER" | "INVENTORY" | "MARKETING" | "SALES" | "SERVICE_ADVISOR" | "SHOP";
  };
  searchText: string;
  title: string;
  tone: "blue" | "green" | "red" | "yellow";
};
type MorningPrioritySource = {
  detail: string;
  dueAt: string | null;
  href: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  rank: number;
  reason: string;
  riskLevel: "NONE" | "WATCH" | "BLOCKED";
  roleFit: "DIRECT" | "SUPPORTING" | "MANAGEMENT";
  sourceId: string;
  sourceLabel: string;
  sourceType: MorningPrioritySourceType;
  staffName: string;
  staffUserId: string;
  title: string;
};

function advisorExceptionCodes(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function safeDateIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function vehicleLabelFor(order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number]) {
  const vehicle = order.vehicle;
  if (!vehicle) return order.inventoryUnit?.inventoryNumber ?? "Vehicle not linked";
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber || order.inventoryUnit?.inventoryNumber || "Vehicle not linked";
}

function vehicleIdentifiersFor(order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number]) {
  return [
    order.vehicle?.vin,
    order.vehicle?.stockNumber,
    order.vehicle?.vehicleNumber,
    order.vehicle?.licensePlate,
    order.inventoryUnit?.inventoryNumber
  ].filter((value): value is string => Boolean(value));
}

function inferWorkbookHistoryWorkflowArea(value: string): NonNullable<WorkbookSearchHistoryItem["resume"]>["workflowArea"] {
  const text = value.toLocaleLowerCase();
  if (/advisor|appointment|promise|authorization|customer update|customer called|call customer|service writer/.test(text)) return "SERVICE_ADVISOR";
  if (/brake|body|repair|recon|qc|diagnos|mechanic|transmission|tire|detail|shop/.test(text)) return "SHOP";
  if (/stock|inventory|vin|parts|title|vehicle|photo|key/.test(text)) return "INVENTORY";
  if (/lead|sale|prospect|customer wants|buy|sold|delivery/.test(text)) return "SALES";
  if (/payment|balance|past due|collection|promise/.test(text)) return "COLLECTIONS";
  if (/ad|signage|marketing|campaign|facebook|google/.test(text)) return "MARKETING";
  return "GENERAL_MANAGER";
}

function appointmentVehicleIdentifiersFor(appointment: { vehicle?: { licensePlate?: string | null; stockNumber?: string | null; vehicleNumber?: string | null; vin?: string | null } | null }) {
  return [
    appointment.vehicle?.vin,
    appointment.vehicle?.stockNumber,
    appointment.vehicle?.vehicleNumber,
    appointment.vehicle?.licensePlate
  ].filter((value): value is string => Boolean(value));
}

function priorityRank(value: string) {
  if (value === "CRITICAL") return 4;
  if (value === "HIGH") return 3;
  if (value === "MEDIUM") return 2;
  return 1;
}

function taskUrgencyRank(input: { dueAt: Date; priority: string; status: string }) {
  const now = Date.now();
  const dueTime = input.dueAt.getTime();
  const overdue = dueTime < now;
  const dueSoon = dueTime <= now + 4 * 60 * 60 * 1000;
  const statusScore =
    input.status === "BLOCKED" ? 60 :
    input.status === "WAITING_ON_APPROVAL" || input.status === "WAITING_ON_PARTS" ? 45 :
    input.status === "READY_FOR_REVIEW" ? 35 :
    input.status === "IN_PROGRESS" ? 25 :
    15;
  return statusScore + priorityRank(input.priority) * 10 + (overdue ? 20 : dueSoon ? 10 : 0);
}

function roleFitFor(workspaceKey: WorkspaceKey, sourceType: MorningPrioritySourceType, text: string): MorningPrioritySource["roleFit"] {
  const normalized = text.toLocaleLowerCase();
  if (workspaceKey === "MANAGEMENT" || workspaceKey === "VEHICLE_OPERATIONS_LEAD") return "MANAGEMENT";
  if (workspaceKey === "ADVISOR" && (sourceType === "APPOINTMENT" || /customer|approval|authorization|promise|callback|handoff|check in|repair order/.test(normalized))) return "DIRECT";
  if (workspaceKey === "INVENTORY" && /inventory|recon|ready|photo|acquisition|vendor|vehicle/.test(normalized)) return "DIRECT";
  if (workspaceKey === "SERVICE" && /shop|repair|diagnosis|technician|parts|quality|vendor/.test(normalized)) return "DIRECT";
  if (workspaceKey === "TECHNICIAN" && /diagnosis|technician|repair|quality|parts/.test(normalized)) return "DIRECT";
  if (workspaceKey === "PARTS" && /part|eta|vendor|repair readiness/.test(normalized)) return "DIRECT";
  if (workspaceKey === "QUALITY" && /quality|qc|handoff|release|inspection|rework/.test(normalized)) return "DIRECT";
  if (workspaceKey === "SALES" && /lead|sale|customer|delivery|appointment/.test(normalized)) return "DIRECT";
  if (workspaceKey === "MARKETING" && /photo|listing|marketing|advertising/.test(normalized)) return "DIRECT";
  if (workspaceKey === "OFFICE" && /paperwork|document|office|payment|customer/.test(normalized)) return "DIRECT";
  if (workspaceKey === "COLLECTIONS" && /payment|collection|account/.test(normalized)) return "DIRECT";
  return "SUPPORTING";
}

function roleFitRank(fit: MorningPrioritySource["roleFit"]) {
  if (fit === "MANAGEMENT") return 18;
  if (fit === "DIRECT") return 16;
  return 4;
}

function finishMorningPrioritySources(sources: MorningPrioritySource[]) {
  const seen = new Set<string>();
  return sources
    .sort((left, right) => right.rank - left.rank || left.title.localeCompare(right.title))
    .filter((source) => {
      const key = `${source.sourceType}:${source.sourceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 18);
}

function buildSearchText(...values: Array<unknown>) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string | number | boolean | Date => value instanceof Date || ["boolean", "number", "string"].includes(typeof value))
    .map((value) => value instanceof Date ? value.toISOString() : String(value))
    .join(" ")
    .toLocaleLowerCase();
}

function boardDateHrefSuffix(value: Date) {
  return `?date=${encodeURIComponent(value.toISOString().slice(0, 10))}`;
}

function workbookVisibilityWhere(actor: AuthenticatedUser) {
  return isManager(actor)
    ? {}
    : { userId: actor.id };
}

async function buildWorkbookSearchHistory(actor: AuthenticatedUser, todayKey: string): Promise<WorkbookSearchHistoryItem[]> {
  const since = new Date(`${todayKey}T00:00:00.000Z`);
  since.setUTCDate(since.getUTCDate() - 45);
  const workbookWhere = {
    ...workbookVisibilityWhere(actor),
    boardDay: { date: { gte: since } }
  };
  const taskWhere = isManager(actor)
    ? { boardDay: { date: { gte: since } } }
    : {
        boardDay: { date: { gte: since } },
        OR: [
          { assignedUserId: actor.id },
          { createdByUserId: actor.id },
          { recommendedUserId: actor.id },
          { collaborators: { some: { userId: actor.id } } }
        ]
      };
  const [quickUpdates, checklistItems, dailyFocusItems, reportSeeds, tasks] = await Promise.all([
    prisma.workdayQuickUpdate.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        text: true,
        person: true,
        company: true,
        dueWindow: true,
        category: true,
        followUpNeeded: true,
        convertedTaskId: true,
        workbook: { select: { boardDay: { select: { date: true } }, scope: true, user: { select: { name: true } } } }
      },
      take: 60,
      where: { workbook: workbookWhere }
    }),
    prisma.workdayChecklistItem.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        text: true,
        update: true,
        riskNote: true,
        done: true,
        status: true,
        convertedTaskId: true,
        workbook: { select: { boardDay: { select: { date: true } }, scope: true, user: { select: { name: true } } } }
      },
      take: 60,
      where: { workbook: workbookWhere }
    }),
    prisma.workdayDailyFocusItem.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        outcome: true,
        progressUpdate: true,
        status: true,
        supportNeeded: true,
        convertedTaskId: true,
        workbook: { select: { boardDay: { select: { date: true } }, scope: true, user: { select: { name: true } } } }
      },
      take: 60,
      where: { workbook: workbookWhere }
    }),
    prisma.workdayReportSeed.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        detail: true,
        status: true,
        sourceHref: true,
        workbook: { select: { boardDay: { select: { date: true } }, scope: true, user: { select: { name: true } } } }
      },
      take: 60,
      where: { workbook: workbookWhere }
    }),
    prisma.task.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        customerReference: true,
        vehicleReference: true,
        boardDay: { select: { date: true } },
        assignedUser: { select: { name: true } },
        checklistItems: { orderBy: { sortOrder: "asc" }, select: { label: true }, take: 8 },
        comments: { orderBy: { createdAt: "desc" }, select: { body: true }, take: 5 }
      },
      take: 80,
      where: taskWhere
    })
  ]);

  return [
    ...quickUpdates.map((item): WorkbookSearchHistoryItem => {
      const date = item.workbook.boardDay.date;
      const context = [
        date.toISOString().slice(0, 10),
        item.workbook.scope === "STAFF" ? "Staff Workbook" : "COO Workbook",
        item.workbook.user.name,
        item.convertedTaskId ? "Converted to task" : "Not converted to task"
      ].join(" · ");
      return {
        action: item.convertedTaskId ? "Open task" : "Open quick update",
        context,
        description: item.text,
        href: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : `/vehicles/coo-workbook/quick-update${boardDateHrefSuffix(date)}`,
        id: `history-quick-${item.id}`,
        kind: "Workbook History",
        ...(item.convertedTaskId ? {} : {
          resume: {
            boardDate: date.toISOString().slice(0, 10),
            description: `Resumed from ${context}. ${item.text}`,
            id: item.id,
            priority: item.followUpNeeded ? "HIGH" : "MEDIUM",
            source: "quick" as const,
            title: item.followUpNeeded ? `Follow up: ${item.text.slice(0, 72)}` : item.text,
            workflowArea: inferWorkbookHistoryWorkflowArea(`${item.text} ${item.category} ${item.company}`)
          }
        }),
        searchText: buildSearchText(item.text, item.person, item.company, item.dueWindow, item.category, context),
        title: item.text,
        tone: item.followUpNeeded || !item.convertedTaskId ? "yellow" : "blue"
      };
    }),
    ...checklistItems.map((item): WorkbookSearchHistoryItem => {
      const date = item.workbook.boardDay.date;
      const context = [
        date.toISOString().slice(0, 10),
        item.workbook.scope === "STAFF" ? "Staff Checklist" : "COO Checklist",
        item.done ? "Done" : item.status === "RED" ? "Blocked" : item.status === "YELLOW" ? "Needs update" : "Open",
        item.convertedTaskId ? "Converted to task" : "Workbook item"
      ].join(" · ");
      return {
        action: item.convertedTaskId ? "Open task" : "Open checklist",
        context,
        description: item.update || item.riskNote || item.text,
        href: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : `/vehicles/coo-workbook/checklist${boardDateHrefSuffix(date)}`,
        id: `history-checklist-${item.id}`,
        kind: "Workbook History",
        ...(item.convertedTaskId ? {} : {
          resume: {
            boardDate: date.toISOString().slice(0, 10),
            description: `Resumed from ${context}. ${item.update || item.riskNote || item.text}`,
            id: item.id,
            priority: item.status === "RED" ? "HIGH" : item.status === "YELLOW" ? "MEDIUM" : "LOW",
            source: "checklist" as const,
            title: item.text,
            workflowArea: inferWorkbookHistoryWorkflowArea(`${item.text} ${item.update} ${item.riskNote}`)
          }
        }),
        searchText: buildSearchText(item.text, item.update, item.riskNote, context),
        title: item.text,
        tone: item.status === "RED" ? "red" : item.status === "YELLOW" ? "yellow" : "blue"
      };
    }),
    ...dailyFocusItems.map((item): WorkbookSearchHistoryItem => {
      const date = item.workbook.boardDay.date;
      const context = [
        date.toISOString().slice(0, 10),
        item.workbook.scope === "STAFF" ? "Staff Focus" : "COO Focus",
        item.status.replaceAll("_", " ").toLocaleLowerCase(),
        item.convertedTaskId ? "Converted to task" : "Workbook item"
      ].join(" · ");
      return {
        action: item.convertedTaskId ? "Open task" : "Open action plan",
        context,
        description: item.progressUpdate || item.supportNeeded || item.outcome,
        href: item.convertedTaskId ? `/tasks/${item.convertedTaskId}` : `/vehicles/coo-workbook/action-plan${boardDateHrefSuffix(date)}`,
        id: `history-focus-${item.id}`,
        kind: "Workbook History",
        ...(item.convertedTaskId ? {} : {
          resume: {
            boardDate: date.toISOString().slice(0, 10),
            description: `Resumed from ${context}. ${item.progressUpdate || item.supportNeeded || item.outcome}`,
            id: item.id,
            priority: "HIGH",
            source: "focus" as const,
            title: item.outcome,
            workflowArea: inferWorkbookHistoryWorkflowArea(`${item.outcome} ${item.progressUpdate} ${item.supportNeeded}`)
          }
        }),
        searchText: buildSearchText(item.outcome, item.progressUpdate, item.supportNeeded, context),
        title: item.outcome,
        tone: item.status === "DONE" ? "green" : item.status === "CARRY_OVER" ? "yellow" : "blue"
      };
    }),
    ...reportSeeds.map((item): WorkbookSearchHistoryItem => {
      const date = item.workbook.boardDay.date;
      const context = [
        date.toISOString().slice(0, 10),
        item.workbook.scope === "STAFF" ? "Staff Report Seed" : "COO Report Seed",
        item.status.replaceAll("_", " ").toLocaleLowerCase()
      ].join(" · ");
      return {
        action: item.sourceHref ? "Open source" : "Open report seed",
        context,
        description: item.detail,
        href: item.sourceHref ?? `/vehicles/coo-workbook/report-seeds${boardDateHrefSuffix(date)}`,
        id: `history-seed-${item.id}`,
        kind: "Workbook History",
        resume: {
          boardDate: date.toISOString().slice(0, 10),
          description: `Resumed from ${context}. ${item.detail}`,
          id: item.id,
          priority: item.status === "CARRIED_OVER" ? "HIGH" : "MEDIUM",
          source: "reportSeed" as const,
          title: item.title,
          workflowArea: inferWorkbookHistoryWorkflowArea(`${item.title} ${item.detail}`)
        },
        searchText: buildSearchText(item.title, item.detail, item.status, context),
        title: item.title,
        tone: item.status === "CARRIED_OVER" ? "yellow" : "blue"
      };
    }),
    ...tasks.map((task): WorkbookSearchHistoryItem => {
      const date = task.boardDay.date;
      const checklistText = task.checklistItems.map((item) => item.label).join(" ");
      const commentText = task.comments.map((item) => item.body).join(" ");
      const context = [
        date.toISOString().slice(0, 10),
        task.assignedUser.name,
        task.status.replaceAll("_", " ").toLocaleLowerCase()
      ].join(" · ");
      return {
        action: "Open task",
        context,
        description: task.description || task.customerReference || task.vehicleReference || "Task record",
        href: `/tasks/${task.id}`,
        id: `history-task-${task.id}`,
        kind: "Task History",
        searchText: buildSearchText(task.id, task.title, task.description, task.customerReference, task.vehicleReference, checklistText, commentText, context),
        title: task.title,
        tone: task.status === "COMPLETED" ? "green" : task.status === "BLOCKED" ? "red" : "blue"
      };
    })
  ].slice(0, 160);
}

async function buildMorningPrioritySources(actor: AuthenticatedUser, boardDate: string, workspaceKey: WorkspaceKey) {
  const taskRepository = createBoardReadRepository();
  const staffDayRepository = createStaffDayRepository();
  const tasks = await taskRepository.listOpenPriorityTasks();
  const canSeeTeam = isManager(actor);
  const staffDays = canSeeTeam
    ? await staffDayRepository.listForBoardDate(boardDate)
    : await staffDayRepository.findForUser(boardDate, actor.id).then((staffDay) => staffDay ? [staffDay] : []);

  const taskSources = tasks
    .filter((task) => task.status !== "COMPLETED" && (canSeeTeam || task.assignedUser.id === actor.id || task.recommendedUser?.id === actor.id))
    .map((task): MorningPrioritySource => {
      const detail = [
        task.assignedUser.name,
        task.status.replaceAll("_", " ").toLocaleLowerCase(),
        task.customerReference,
        task.vehicleReference,
        task.recommendationExplanation
      ].filter(Boolean).join(" · ");
      const roleFit = roleFitFor(workspaceKey, "TASK", `${task.title} ${detail}`);
      return {
        detail,
        dueAt: task.dueAt.toISOString(),
        href: `/tasks/${task.id}`,
        priority: task.priority,
        rank: taskUrgencyRank(task) + roleFitRank(roleFit),
        reason: `Suggested from an open ${task.priority.toLocaleLowerCase()} task that is ${task.status.replaceAll("_", " ").toLocaleLowerCase()}.`,
        riskLevel: task.status === "BLOCKED" ? "BLOCKED" : ["WAITING_ON_APPROVAL", "WAITING_ON_PARTS"].includes(task.status) ? "WATCH" : "NONE",
        roleFit,
        sourceId: task.id,
        sourceLabel: "Task",
        sourceType: "TASK",
        staffUserId: task.assignedUser.id,
        staffName: task.assignedUser.name,
        title: task.title
      };
    });

  const dutySources = staffDays.flatMap((staffDay) => staffDay.dutyItems.map((duty) => ({ duty, staffDay })))
    .filter(({ duty }) => !duty.completed)
    .map(({ duty, staffDay }): MorningPrioritySource => {
      const detail = [staffDay.user.name, duty.workflowArea.replaceAll("_", " ").toLocaleLowerCase(), duty.description].filter(Boolean).join(" · ");
      const roleFit = roleFitFor(workspaceKey, "DUTY", `${duty.label} ${detail}`);
      return {
        detail,
        dueAt: null,
        href: canSeeTeam ? `/my-day?userId=${encodeURIComponent(staffDay.user.id)}` : "/my-day",
        priority: duty.required ? "HIGH" : "MEDIUM",
        rank: (duty.required ? 35 : 18) + Math.max(0, 10 - duty.sortOrder) + roleFitRank(roleFit),
        reason: duty.required ? "Suggested from an unfinished required staff duty." : "Suggested from an unfinished staff duty.",
        riskLevel: "NONE",
        roleFit,
        sourceId: duty.id,
        sourceLabel: "Staff duty",
        sourceType: "DUTY",
        staffUserId: staffDay.user.id,
        staffName: staffDay.user.name,
        title: duty.label
      };
    });

  return finishMorningPrioritySources([...taskSources, ...dutySources]);
}

function operatingPriorityRank(input: { actionPriority: number; overdue: boolean; targetAt: string | null; unresolvedPartDemandCount: number }) {
  const dueTime = input.targetAt ? new Date(input.targetAt).getTime() : 0;
  const dueSoon = dueTime > 0 && dueTime <= Date.now() + 4 * 60 * 60 * 1000;
  return 92 - input.actionPriority * 9 + (input.overdue ? 24 : dueSoon ? 12 : 0) + Math.min(12, input.unresolvedPartDemandCount * 4);
}

function priorityForAdvisorAction(kind: AdvisorActionKind): MorningPrioritySource["priority"] {
  if (kind === "AUTHORIZATION" || kind === "PROMISE_RISK") return "CRITICAL";
  if (kind === "PARTS_DELAY" || kind === "TECHNICIAN_CLARIFICATION" || kind === "HANDOFF") return "HIGH";
  return "MEDIUM";
}

function riskForAdvisorAction(kind: AdvisorActionKind, overdue: boolean): MorningPrioritySource["riskLevel"] {
  if (overdue || kind === "AUTHORIZATION" || kind === "PROMISE_RISK") return "WATCH";
  if (kind === "PARTS_DELAY" || kind === "TECHNICIAN_CLARIFICATION") return "WATCH";
  return "NONE";
}

function buildOperatingMorningPrioritySources(
  actor: AuthenticatedUser,
  workspaceKey: WorkspaceKey,
  actionQueue: Array<{ action: ReturnType<typeof advisorActionFor>; order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number] }>,
  appointments: Array<{ customer?: { displayName?: string | null } | null; id: string; appointmentNumber: string; startsAt?: Date | null; title?: string | null; vehicles: Array<{ vehicle?: { make?: string | null; model?: string | null; vehicleNumber?: string | null; vin?: string | null; year?: number | null } | null }> }>
) {
  const repairOrderSources = actionQueue
    .filter(({ action }) => action.kind !== "FOLLOW_UP_SCHEDULED")
    .map(({ action, order }): MorningPrioritySource => {
      const vehicleLabel = vehicleLabelFor(order);
      const customerName = customerLabelFor(order);
      const targetAt = safeDateIso(order.targetAt);
      const priority = priorityForAdvisorAction(action.kind);
      const riskLevel = riskForAdvisorAction(action.kind, order.age.overdue);
      const detail = [
        customerName,
        order.repairOrderNumber,
        vehicleLabel,
        action.reason,
        safeText(order.nextAction, "")
      ].filter(Boolean).join(" · ");
      const roleFit = roleFitFor(workspaceKey, "REPAIR_ORDER", `${action.label} ${detail}`);
      return {
        detail,
        dueAt: targetAt,
        href: `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`,
        priority,
        rank: operatingPriorityRank({ actionPriority: action.priority, overdue: order.age.overdue, targetAt, unresolvedPartDemandCount: unresolvedPartDemandCountFor(order) }) + roleFitRank(roleFit),
        reason: `Suggested from a repair-order ${action.kind.toLocaleLowerCase().replaceAll("_", " ")} signal${order.age.overdue ? " with overdue timing" : ""}.`,
        riskLevel,
        roleFit,
        sourceId: order.id,
        sourceLabel: "Repair order signal",
        sourceType: "REPAIR_ORDER",
        staffUserId: actor.id,
        staffName: actor.name,
        title: `${action.label}: ${order.repairOrderNumber} ${vehicleLabel}`
      };
    });

  const appointmentSources = appointments
    .filter((appointment) => appointment.startsAt)
    .map((appointment): MorningPrioritySource => {
      const vehicle = appointment.vehicles[0]?.vehicle ?? null;
      const vehicleLabel = vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber || "Vehicle not linked" : "Vehicle not linked";
      const customerName = appointment.customer?.displayName ?? "Customer not linked";
      const startsAt = safeDateIso(appointment.startsAt);
      const title = `Check in ${customerName}: ${vehicleLabel}`;
      const detail = [appointment.appointmentNumber, safeText(appointment.title, "Appointment"), startsAt ? `Starts ${new Date(startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""].filter(Boolean).join(" · ");
      const roleFit = roleFitFor(workspaceKey, "APPOINTMENT", `${title} ${detail}`);
      return {
        detail,
        dueAt: startsAt,
        href: "/appointments?view=board",
        priority: "HIGH",
        rank: 58 + roleFitRank(roleFit),
        reason: "Suggested from a same-day appointment/check-in source.",
        riskLevel: "NONE",
        roleFit,
        sourceId: appointment.id,
        sourceLabel: "Appointment",
        sourceType: "APPOINTMENT",
        staffUserId: actor.id,
        staffName: actor.name,
        title
      };
    });

  return finishMorningPrioritySources([...repairOrderSources, ...appointmentSources]);
}

function customerLabelFor(order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number]) {
  return order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal vehicle";
}

function unresolvedPartDemandCountFor(order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number]) {
  const partDemands = (order as { partDemands?: Array<{ quantityReserved: number; quantityRequired: number }> }).partDemands;
  return Array.isArray(partDemands)
    ? partDemands.filter((part) => part.quantityReserved < part.quantityRequired).length
    : 0;
}

function activeVendorWork(
  order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number]
) {
  const works = order.vendorWorks ?? [];
  return works.find((work) => !["COMPLETED", "CANCELLED"].includes(work.status)) ?? works[0] ?? null;
}

function advisorActionFor(order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number]) {
  const nextActionRaw = safeText(order.nextAction);
  const nextAction = nextActionRaw.toLowerCase();
  const stage = safeText(order.stage).toUpperCase();
  const operatingState = safeText(order.operatingState).toUpperCase();
  const latestAdvisorUpdate = order.advisorUpdates[0] ?? null;
  const exceptionCodes = advisorExceptionCodes(latestAdvisorUpdate?.exceptionCodes);
  const vendorWork = activeVendorWork(order);
  const vendorWaitingParts = vendorWork?.status === "WAITING_PARTS";

  if (exceptionCodes.includes("TECHNICIAN_CLARIFICATION")) {
    return {
      kind: "TECHNICIAN_CLARIFICATION" as AdvisorActionKind,
      label: "Technician clarification",
      priority: 1,
      reason: "Advisor is waiting on a technician response before updating the customer."
    };
  }

  if (exceptionCodes.includes("CUSTOMER_ACTION")) {
    return {
      kind: "AUTHORIZATION" as AdvisorActionKind,
      label: "Customer action needed",
      priority: 1,
      reason: latestAdvisorUpdate?.customerVisibleSummary ?? "Customer decision or follow-up is still required."
    };
  }

  if (exceptionCodes.includes("PROMISE_RISK")) {
    return {
      kind: "PROMISE_RISK" as AdvisorActionKind,
      label: "Promise risk",
      priority: 2,
      reason: latestAdvisorUpdate?.customerVisibleSummary ?? "Promise risk was recorded by the advisor."
    };
  }

  if (exceptionCodes.includes("WAITING_PARTS")) {
    return {
      kind: "PARTS_DELAY" as AdvisorActionKind,
      label: "Parts / ETA check",
      priority: 3,
      reason: latestAdvisorUpdate?.customerVisibleSummary ?? "Advisor recorded a parts-related blocker."
    };
  }

  if (vendorWaitingParts) {
    return {
      kind: "PARTS_DELAY" as AdvisorActionKind,
      label: "Vendor waiting on our parts",
      priority: 3,
      reason: vendorWork?.nextAction || vendorWork?.lastUpdateSummary || "Outside vendor is waiting on parts from the dealership before work can continue."
    };
  }

  if (latestAdvisorUpdate?.nextContactAt && latestAdvisorUpdate.nextContactAt > new Date()) {
    return {
      kind: "FOLLOW_UP_SCHEDULED" as AdvisorActionKind,
      label: "Follow-up scheduled",
      priority: 6,
      reason: `Next contact is scheduled for ${latestAdvisorUpdate.nextContactAt.toLocaleString()}.`
    };
  }

  if (latestAdvisorUpdate?.statusCode === "CUSTOMER_UPDATED") {
    return {
      kind: "CUSTOMER_UPDATE" as AdvisorActionKind,
      label: "Customer recently updated",
      priority: 7,
      reason: latestAdvisorUpdate.customerVisibleSummary
    };
  }

  if (/approval|authorization|authorize|estimate/i.test(nextActionRaw)) {
    return {
      kind: "AUTHORIZATION" as AdvisorActionKind,
      label: "Authorization needed",
      priority: 1,
      reason: "Customer decision may be required before work can continue."
    };
  }

  if (order.age.overdue || /promise|due|overdue|late|completion|ready time/i.test(nextActionRaw)) {
    return {
      kind: "PROMISE_RISK" as AdvisorActionKind,
      label: "Promise risk",
      priority: 2,
      reason: "The promised or target time should be reviewed before updating the customer."
    };
  }

  if (operatingState === "WAITING" || /part|parts|eta|vendor/i.test(nextAction)) {
    return {
      kind: "PARTS_DELAY" as AdvisorActionKind,
      label: "Parts / ETA check",
      priority: 3,
      reason: "Parts readiness may affect the next customer update."
    };
  }

  if (stage === "HANDOFF" || /handoff|pickup|ready|release|complete/i.test(nextAction)) {
    return {
      kind: "HANDOFF" as AdvisorActionKind,
      label: "Customer handoff",
      priority: 4,
      reason: "Vehicle may need a ready-for-pickup or completion conversation."
    };
  }

  return {
    kind: "CUSTOMER_UPDATE" as AdvisorActionKind,
    label: "Customer update",
    priority: 5,
    reason: "Open repair order has customer-facing status to monitor."
  };
}

export async function getServiceAdvisorWorkspace(actor: AuthenticatedUser, boardDate?: string) {
  const [options, openOrders] = await Promise.all([
    getRepairOrderCreateOptions(actor),
    listRepairOrders(actor, { page: 1, pageSize: 12 })
  ]);
  const now = new Date();
  const todayKey = boardDate ? normalizeBoardDate(boardDate) : currentWorkdayBoardDate(now);
  const workspaceKey = getWorkspaceKey(actor);
  const workspaceDefinition = getWorkspaceDefinition(workspaceKey);
  const staffWorkbookLabel = getWorkspaceWorkbookLabel(workspaceKey);
  const managementWorkbookLabel = isManager(actor) ? getWorkspaceWorkbookLabel("MANAGEMENT") : "Team Workbook";
  const appointments = options.appointments.map((appointment) => ({
    ...appointment,
      customer: appointment.participants[0]?.customer ?? null,
      vehicle: appointment.vehicles[0]?.vehicle ?? null
  }));
  const todaysArrivals = appointments.filter((appointment) => appointment.startsAt ? currentWorkdayBoardDate(appointment.startsAt) === todayKey : false);
  const waitingCheckIn = appointments.filter((appointment) => !appointment.startsAt || appointment.startsAt >= new Date(now.getTime() - 12 * 60 * 60 * 1000));
  const activeRepairOrders = openOrders.items.filter((order) => order.operatingState !== "CLOSED" && order.stage !== "CANCELLED");
  const actionQueue = activeRepairOrders
    .map((order) => ({ order, action: advisorActionFor(order) }))
    .sort((left, right) => left.action.priority - right.action.priority || ((left.order.targetAt instanceof Date ? left.order.targetAt.getTime() : 0) - (right.order.targetAt instanceof Date ? right.order.targetAt.getTime() : 0)));
  const activeHandoffs = actionQueue.filter(({ action }) => !["CUSTOMER_UPDATE", "FOLLOW_UP_SCHEDULED"].includes(action.kind));
  const needsAttention = actionQueue.filter(({ action }) => ["AUTHORIZATION", "PROMISE_RISK", "HANDOFF", "CUSTOMER_UPDATE"].includes(action.kind));
  const waitingOnOthers = actionQueue.filter(({ action }) => ["PARTS_DELAY", "TECHNICIAN_CLARIFICATION", "FOLLOW_UP_SCHEDULED"].includes(action.kind));
  const approvalCount = actionQueue.filter(({ action }) => action.kind === "AUTHORIZATION").length;
  const handoffCount = actionQueue.filter(({ action }) => action.kind === "HANDOFF").length;
  const reportExceptions = needsAttention.length + waitingOnOthers.length;
  const [workbook, staffWorkbook, staffWorkbookSummaries, workbookPrioritySources, workbookSearchHistory] = await Promise.all([
    getCooWorkbook(actor, todayKey, {
    approvalCount,
    handoffCount,
    reportExceptions
    }),
    getStaffWorkbook(actor, todayKey),
    isManager(actor) ? getStaffWorkbookSummaries(actor, todayKey) : Promise.resolve([]),
    buildMorningPrioritySources(actor, todayKey, workspaceKey),
    buildWorkbookSearchHistory(actor, todayKey)
  ]);
  const morningPrioritySources = finishMorningPrioritySources([
    ...buildOperatingMorningPrioritySources(actor, workspaceKey, actionQueue, todaysArrivals),
    ...workbookPrioritySources
  ]);
  const inbox = openOrders.items.flatMap((order) => order.advisorUpdates.map((update) => {
    const exceptionCodes = advisorExceptionCodes(update.exceptionCodes);
    const audience = exceptionCodes.includes("MANAGER_REVIEW")
      ? "MANAGEMENT" as const
      : update.contactDirection === "INTERNAL" || update.contactChannel === "INTERNAL" || exceptionCodes.some((code) => ["TECHNICIAN_CLARIFICATION", "WAITING_PARTS"].includes(code))
        ? "TEAM" as const
        : "CUSTOMER" as const;
    const needsResponse = update.contactDirection === "INBOUND" || exceptionCodes.length > 0 || audience !== "CUSTOMER" && update.authorUser?.id !== actor.id;
    return {
      id: update.id,
      audience,
      authorName: update.authorUser?.name ?? "Unknown staff",
      channel: update.contactChannel,
      customerName: customerLabelFor(order),
      direction: update.contactDirection,
      dueAt: safeDateIso(update.nextContactAt),
      exceptionCodes,
      needsResponse,
      occurredAt: safeDateIso(update.occurredAt) ?? new Date(0).toISOString(),
      preview: audience === "CUSTOMER" ? safeText(update.customerVisibleSummary, "Customer communication recorded.") : safeText(update.internalNotes ?? update.contactOutcome, "Internal team update recorded."),
      repairOrderId: order.id,
      repairOrderNumber: order.repairOrderNumber,
      statusCode: update.statusCode,
      subject: safeText(update.contactOutcome, "Repair order update"),
      transportState: audience === "CUSTOMER" ? "RECORDED_CONTACT" as const : audience === "MANAGEMENT" ? "ESCALATION_RECORDED" as const : "SHARED_IN_REPAIR_ORDER" as const,
      vehicleIdentifiers: vehicleIdentifiersFor(order),
      vehicleLabel: vehicleLabelFor(order)
    };
  })).sort((left, right) => Number(right.needsResponse) - Number(left.needsResponse) || new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  return {
    boardDate: todayKey,
    generatedAt: now.toISOString(),
    advisor: { id: actor.id, name: actor.name },
    workspace: {
      canUseManagementWorkbook: isManager(actor),
      key: workspaceKey,
      label: workspaceDefinition.label,
      staffWorkbookLabel,
      managementWorkbookLabel
    },
    workbook,
    staffWorkbook,
    staffWorkbookSummaries,
    morningPrioritySources,
    workbookSearchHistory,
    counts: {
      activeRepairOrders: activeRepairOrders.length,
      availableAppointments: appointments.length,
      customers: options.customers.length,
      todaysArrivals: todaysArrivals.length,
      waitingCheckIn: waitingCheckIn.length,
      handoffs: activeHandoffs.length,
      needsAttention: needsAttention.length,
      waitingOnOthers: waitingOnOthers.length,
      inboxNeedsResponse: inbox.filter((item) => item.needsResponse).length
    },
    inbox: inbox.slice(0, 40),
    actionQueue: actionQueue.slice(0, 12).map(({ order, action }) => ({
      id: order.id,
      actionKind: action.kind,
      actionLabel: action.label,
      actionReason: action.reason,
      customerName: customerLabelFor(order),
      currentLocation: activeVendorWork(order)?.currentLocation ?? order.location?.name ?? "Location unavailable",
      hasActiveVendorWork: Boolean(activeVendorWork(order)),
      nextAction: safeText(order.nextAction, "Next action not recorded"),
      operatingState: safeText(order.operatingState, "UNKNOWN"),
      repairOrderNumber: order.repairOrderNumber,
      stage: safeText(order.stage, "UNKNOWN"),
      targetAt: safeDateIso(order.targetAt) ?? new Date(0).toISOString(),
      unresolvedPartDemandCount: unresolvedPartDemandCountFor(order),
      vehicleIdentifiers: vehicleIdentifiersFor(order),
      vehicleLabel: vehicleLabelFor(order),
      vendorStatus: activeVendorWork(order)?.status ?? null,
      overdue: order.age.overdue,
      latestAdvisorUpdate: order.advisorUpdates[0]
        ? {
          authorName: order.advisorUpdates[0].authorUser?.name ?? "Unknown staff",
          occurredAt: safeDateIso(order.advisorUpdates[0].occurredAt) ?? new Date(0).toISOString(),
          statusCode: order.advisorUpdates[0].statusCode,
          summary: safeText(order.advisorUpdates[0].customerVisibleSummary, "Update recorded")
        }
        : null
    })),
    appointments: waitingCheckIn.slice(0, 6).map((appointment) => ({
      id: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      customerName: appointment.customer?.displayName ?? "Customer not linked",
      email: appointment.customer?.email ?? null,
      phoneNumber: appointment.customer?.phoneNumber ?? null,
      startsAt: safeDateIso(appointment.startsAt),
      title: safeText(appointment.title, "Appointment"),
      vehicleIdentifiers: appointmentVehicleIdentifiersFor(appointment),
      vehicleLabel: appointment.vehicle
        ? [appointment.vehicle.year, appointment.vehicle.make, appointment.vehicle.model].filter(Boolean).join(" ") || appointment.vehicle.vehicleNumber
        : "Vehicle not linked"
    })),
    repairOrders: activeRepairOrders.slice(0, 8).map((order) => ({
      id: order.id,
      age: order.age,
      customerName: customerLabelFor(order),
      nextAction: safeText(order.nextAction, "Next action not recorded"),
      operatingState: safeText(order.operatingState, "UNKNOWN"),
      repairOrderNumber: order.repairOrderNumber,
      stage: safeText(order.stage, "UNKNOWN"),
      targetAt: safeDateIso(order.targetAt) ?? new Date(0).toISOString(),
      vehicleIdentifiers: vehicleIdentifiersFor(order),
      vehicleLabel: vehicleLabelFor(order)
    }))
  };
}

export type ServiceAdvisorWorkspaceModel = Awaited<ReturnType<typeof getServiceAdvisorWorkspace>>;
