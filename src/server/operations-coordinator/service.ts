import type { AuthenticatedUser } from "@/server/auth/store";
import { getPartsOperationsWorkspace } from "@/server/parts-operations/service";
import { listRepairOrders, getRepairOrderCreateOptions } from "@/server/repair-order/service";
import { getMyTasksViewModelForToday } from "@/server/services/my-tasks";

type SourceState = "READY" | "EMPTY" | "UNAVAILABLE";
type ActionResolverOutcome = "COMPLETE_SAFELY" | "PREPARE_CANONICAL_WORKFLOW" | "ROUTE_TO_AUTHORITY" | "READ_ONLY_PEEK";
type CoordinatorActionType =
  | "ARRIVAL"
  | "CUSTOMER_WAITING"
  | "PROMISE_RISK"
  | "PARTS_BLOCK"
  | "MISSING_DOCUMENT"
  | "PAYMENT_RISK"
  | "ESCALATION"
  | "TASK";

export type CoordinatorRankInput = {
  id: string;
  label: string;
  href: string;
  type: CoordinatorActionType;
  customerWaiting?: boolean;
  appointmentAt?: string | null;
  dueAt?: string | null;
  blockerSeverity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  missingDocument?: boolean;
  paymentRisk?: boolean;
  promiseRisk?: boolean;
  escalationState?: boolean;
  source: string;
  detail: string;
};

export type CoordinatorAction = CoordinatorRankInput & {
  rank: number;
  resolver: ActionResolverOutcome;
};

export function resolveCoordinatorAction(action: Pick<CoordinatorRankInput, "type">): ActionResolverOutcome {
  if (action.type === "MISSING_DOCUMENT" || action.type === "TASK") return "COMPLETE_SAFELY";
  if (action.type === "ARRIVAL" || action.type === "CUSTOMER_WAITING") return "PREPARE_CANONICAL_WORKFLOW";
  if (action.type === "PROMISE_RISK" || action.type === "PARTS_BLOCK" || action.type === "ESCALATION") return "ROUTE_TO_AUTHORITY";
  return "READ_ONLY_PEEK";
}

export function rankCoordinatorActions(actions: CoordinatorRankInput[], now = new Date()): CoordinatorAction[] {
  const severityWeight = { LOW: 8, MEDIUM: 18, HIGH: 32, CRITICAL: 48 } as const;
  return actions
    .map((action) => {
      const appointmentMinutes = action.appointmentAt ? (new Date(action.appointmentAt).getTime() - now.getTime()) / 60000 : null;
      const dueMinutes = action.dueAt ? (new Date(action.dueAt).getTime() - now.getTime()) / 60000 : null;
      let rank = 0;
      if (action.customerWaiting) rank += 62;
      if (appointmentMinutes !== null && appointmentMinutes <= 15) rank += 28;
      else if (appointmentMinutes !== null && appointmentMinutes <= 60) rank += 18;
      if (dueMinutes !== null && dueMinutes < 0) rank += 30;
      else if (dueMinutes !== null && dueMinutes <= 120) rank += 16;
      if (action.blockerSeverity) rank += severityWeight[action.blockerSeverity];
      if (action.missingDocument) rank += 20;
      if (action.paymentRisk) rank += 18;
      if (action.promiseRisk) rank += 22;
      if (action.escalationState) rank += 24;
      return { ...action, rank, resolver: resolveCoordinatorAction(action) };
    })
    .sort((left, right) => right.rank - left.rank || left.label.localeCompare(right.label));
}

async function safeSource<T>(reader: () => Promise<T>) {
  try {
    return { state: "READY" as SourceState, value: await reader(), reason: null };
  } catch (error) {
    return {
      state: "UNAVAILABLE" as SourceState,
      value: null,
      reason: error instanceof Error ? error.message : "Source unavailable"
    };
  }
}

function sourceState(hasData: boolean, source: { state: SourceState }) {
  if (source.state === "UNAVAILABLE") return "UNAVAILABLE" as const;
  return hasData ? "READY" as const : "EMPTY" as const;
}

export async function getOperationsCoordinatorWorkspace(actor: AuthenticatedUser) {
  const now = new Date();
  const [createOptions, repairOrders, parts, myTasks] = await Promise.all([
    safeSource(() => getRepairOrderCreateOptions(actor)),
    safeSource(() => listRepairOrders(actor, { page: 1, pageSize: 16 })),
    safeSource(() => getPartsOperationsWorkspace(actor)),
    safeSource(() => getMyTasksViewModelForToday(actor))
  ]);

  const appointments = createOptions.value?.appointments ?? [];
  const customers = createOptions.value?.customers ?? [];
  const vehicles = createOptions.value?.vehicles ?? [];
  const orders = repairOrders.value?.items ?? [];
  const tasks = myTasks.value?.tasks ?? [];
  const partsDemands = parts.value?.service.demands ?? [];
  const receivingExceptions = parts.value?.service.discrepancies ?? [];
  const partsReceipts = parts.value?.service.receipts ?? [];

  const todaysKey = now.toISOString().slice(0, 10);
  const todaysAppointments = appointments.filter((appointment) => appointment.startsAt?.toISOString().slice(0, 10) === todaysKey);
  const openTasks = tasks.filter((task) => task.status !== "COMPLETED");
  const blockedOrders = orders.filter((order) => /part|approval|authorize|wait|block|delay/i.test(`${order.operatingState} ${order.nextAction}`));

  const actionInputs: CoordinatorRankInput[] = [
    ...todaysAppointments.slice(0, 6).map((appointment) => {
      const customer = appointment.participants[0]?.customer;
      const vehicle = appointment.vehicles[0]?.vehicle;
      return {
        id: `arrival-${appointment.id}`,
        type: "ARRIVAL" as CoordinatorActionType,
        label: customer?.displayName ?? appointment.title,
        detail: vehicle
          ? `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.vehicleNumber
          : "Appointment needs vehicle confirmation",
        href: `/vehicles/repair-orders?intakeSource=APPOINTMENT&appointmentId=${encodeURIComponent(appointment.id)}`,
        appointmentAt: appointment.startsAt?.toISOString() ?? null,
        customerWaiting: appointment.startsAt ? appointment.startsAt.getTime() <= now.getTime() + 15 * 60 * 1000 : false,
        source: "Appointments"
      };
    }),
    ...orders.slice(0, 8).map((order) => ({
      id: `ro-${order.id}`,
      type: order.age.overdue ? "PROMISE_RISK" as CoordinatorActionType : "ESCALATION" as CoordinatorActionType,
      label: `${order.repairOrderNumber} · ${order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal vehicle"}`,
      detail: order.nextAction,
      href: `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(order.id)}`,
      dueAt: order.targetAt.toISOString(),
      promiseRisk: order.age.overdue,
      escalationState: blockedOrders.some((blocked) => blocked.id === order.id),
      blockerSeverity: order.age.overdue ? "HIGH" as const : "MEDIUM" as const,
      source: "Repair Orders"
    })),
    ...partsDemands.slice(0, 5).map((demand) => ({
      id: `part-${demand.id}`,
      type: "PARTS_BLOCK" as CoordinatorActionType,
      label: demand.part?.partNumber ?? demand.part?.description ?? "Part demand",
      detail: `${demand.repairOrder.repairOrderNumber} · ${demand.status}`,
      href: "/vehicles/parts-operations?view=demand",
      dueAt: demand.requiredAt?.toISOString?.() ?? null,
      blockerSeverity: "MEDIUM" as const,
      source: "Parts"
    })),
    ...openTasks.slice(0, 6).map((task) => ({
      id: `task-${task.id}`,
      type: "TASK" as CoordinatorActionType,
      label: task.title,
      detail: `${task.workflowArea} · ${task.status}`,
      href: `/tasks/${encodeURIComponent(task.id)}`,
      dueAt: task.dueAt,
      escalationState: task.requiresManagerApproval,
      blockerSeverity: task.status === "BLOCKED" ? "HIGH" as const : undefined,
      source: "Tasks"
    }))
  ];

  const quickActions = [
    { label: "New Appointment", href: "/appointments", mode: "PREPARE_CANONICAL_WORKFLOW" },
    { label: "Check In Vehicle", href: "/vehicles/repair-orders?intakeSource=WALK_IN", mode: "PREPARE_CANONICAL_WORKFLOW" },
    { label: "Add Customer / Vehicle", href: "/customers", mode: "PREPARE_CANONICAL_WORKFLOW" },
    { label: "Start Service Intake", href: "/vehicles/repair-orders?intakeSource=WALK_IN", mode: "PREPARE_CANONICAL_WORKFLOW" },
    { label: "Receive Parts", href: "/vehicles/parts-receiving", mode: "COMPLETE_SAFELY" },
    { label: "Upload Document", href: "/tasks?department=OFFICE", mode: "COMPLETE_SAFELY" },
    { label: "Upload Photos", href: "/tasks?department=ADVERTISING", mode: "COMPLETE_SAFELY" },
    { label: "Start Sales Packet", href: "/tasks?department=SALES", mode: "PREPARE_CANONICAL_WORKFLOW" },
    { label: "Start Finance Packet", href: "/tasks?department=SALES&packet=finance", mode: "PREPARE_CANONICAL_WORKFLOW" },
    { label: "Verify Insurance", href: "/tasks?department=SALES&packet=insurance", mode: "COMPLETE_SAFELY" },
    { label: "Initiate Rental", href: "/tasks?department=SERVICE&packet=rental", mode: "PREPARE_CANONICAL_WORKFLOW" },
    { label: "Record Payment", href: "/tasks?department=COLLECTIONS&action=payment", mode: "PREPARE_CANONICAL_WORKFLOW" },
    { label: "Add Collection Note", href: "/tasks?department=COLLECTIONS", mode: "COMPLETE_SAFELY" }
  ] as const;

  return {
    generatedAt: now.toISOString(),
    coordinator: { id: actor.id, name: actor.name },
    sourceStates: {
      appointments: sourceState(appointments.length > 0, createOptions),
      customers: sourceState(customers.length > 0, createOptions),
      vehicles: sourceState(vehicles.length > 0, createOptions),
      repairOrders: sourceState(orders.length > 0, repairOrders),
      parts: sourceState(Boolean(partsDemands.length || receivingExceptions.length || partsReceipts.length), parts),
      tasks: sourceState(tasks.length > 0, myTasks),
      salesPaperwork: "UNAVAILABLE" as SourceState,
      financePaperwork: "UNAVAILABLE" as SourceState,
      rentals: "UNAVAILABLE" as SourceState,
      payments: "UNAVAILABLE" as SourceState,
      collections: "UNAVAILABLE" as SourceState,
      documents: "UNAVAILABLE" as SourceState,
      marketing: "UNAVAILABLE" as SourceState
    },
    counts: {
      todaysAppointments: todaysAppointments.length,
      activeRepairOrders: repairOrders.value?.total ?? orders.length,
      partsActions: partsDemands.length + receivingExceptions.length,
      paperworkItems: openTasks.filter((task) => /office|sales|paper|document|finance|insurance|rental/i.test(`${task.workflowArea} ${task.title}`)).length,
      openTasks: openTasks.length,
      escalations: blockedOrders.length + openTasks.filter((task) => task.requiresManagerApproval || task.status === "BLOCKED").length
    },
    universalSearch: {
      placeholder: "Search customer, vehicle, VIN, appointment, RO, part, payment, document, or task...",
      noResultActions: [
        { label: "Add customer", href: "/customers?action=new" },
        { label: "Add vehicle", href: "/vehicles/workflows/add-vehicle" },
        { label: "Create appointment", href: "/appointments?action=new" },
        { label: "Route to manager", href: "/manager-review?scope=operations-coordinator" }
      ]
    },
    quickActions,
    advisorSupport: [
      {
        label: "Check in arrival / walk-in",
        detail: "Confirm customer, vehicle, concern, custody, keys, and promised target before repair work is created.",
        href: "/vehicles/repair-orders?intakeSource=WALK_IN",
        mode: "PREPARE_CANONICAL_WORKFLOW" as ActionResolverOutcome
      },
      {
        label: "Appointment and capacity check",
        detail: "Review schedule context before accepting or promising the vehicle.",
        href: "/appointments?view=board",
        mode: "READ_ONLY_PEEK" as ActionResolverOutcome
      },
      {
        label: "Find customer / vehicle",
        detail: "Search canonical records first and prepare missing customer or vehicle information if needed.",
        href: "/customers",
        mode: "PREPARE_CANONICAL_WORKFLOW" as ActionResolverOutcome
      },
      {
        label: "Repair-order status peek",
        detail: "See current repair status, parts/QC blockers, and next advisor-safe customer update.",
        href: "/vehicles/repair-workbench",
        mode: "READ_ONLY_PEEK" as ActionResolverOutcome
      },
      {
        label: "Prepare customer update",
        detail: "Draft or route the update; repair authorization and estimate approval remain protected.",
        href: "/vehicles/repair-workbench?view=advisor-support",
        mode: "ROUTE_TO_AUTHORITY" as ActionResolverOutcome
      },
      {
        label: "Route technician clarification",
        detail: "Capture what the customer needs and route the question to technician/advisor authority.",
        href: "/tasks?department=SERVICE&action=technician-clarification",
        mode: "ROUTE_TO_AUTHORITY" as ActionResolverOutcome
      }
    ],
    actionQueue: rankCoordinatorActions(actionInputs, now).slice(0, 10),
    paperworkCenter: [
      { label: "Sales packet", status: "Placeholder", detail: "Prepare packet; final deal approval stays protected.", href: "/tasks?department=SALES" },
      { label: "Finance packet", status: "Placeholder", detail: "Collect documents; financing approval is blocked for this role.", href: "/tasks?department=SALES&packet=finance" },
      { label: "Insurance verification", status: "Placeholder", detail: "Verify and attach proof; do not rewrite history.", href: "/tasks?department=SALES&packet=insurance" },
      { label: "Rental checklist", status: "Placeholder", detail: "Initiate checklist; final accounting close remains protected.", href: "/tasks?department=SERVICE&packet=rental" },
      { label: "Payments / collections", status: "Placeholder", detail: "Record intake or note; final close/approval stays routed.", href: "/tasks?department=COLLECTIONS" }
    ],
    departmentPanels: [
      { label: "Appointments", state: sourceState(todaysAppointments.length > 0, createOptions), value: todaysAppointments.length, href: "/appointments", detail: "Today arrivals and schedule support" },
      { label: "Service Intake", state: sourceState(orders.length > 0, repairOrders), value: orders.length, href: "/vehicles/repair-orders?intakeSource=WALK_IN", detail: "Walk-ins, custody, and RO preparation" },
      { label: "Repair Orders", state: sourceState(orders.length > 0, repairOrders), value: orders.length, href: "/vehicles/repair-workbench", detail: "Peek status and route advisor/manager actions" },
      { label: "Parts Receiving", state: sourceState(Boolean(partsDemands.length || receivingExceptions.length), parts), value: partsDemands.length + receivingExceptions.length, href: "/vehicles/parts-receiving", detail: "Receive, label, bin, and escalate exceptions" },
      { label: "Inventory / Photos", state: "UNAVAILABLE" as SourceState, value: null, href: "/tasks?department=ADVERTISING", detail: "Photo/listing support routes to marketing tasks" },
      { label: "Sales / Finance", state: "UNAVAILABLE" as SourceState, value: null, href: "/tasks?department=SALES", detail: "Packets, insurance, financing paperwork, delivery support" }
    ],
    escalationRouter: [
      { label: "Manager approval", blocked: true, detail: "Route approvals and policy exceptions to management.", href: "/manager-review?scope=operations-coordinator" },
      { label: "Repair authorization", blocked: true, detail: "Prepare context; advisor/authorized user completes repair authorization.", href: "/vehicles/repair-workbench" },
      { label: "QC override", blocked: true, detail: "Coordinator may view release risk but cannot override QC.", href: "/vehicles/quality-control" },
      { label: "Final accounting close", blocked: true, detail: "Payment intake is allowed only through canonical workflow; close remains protected.", href: "/tasks?department=COLLECTIONS" }
    ]
  };
}

export type OperationsCoordinatorWorkspaceModel = Awaited<ReturnType<typeof getOperationsCoordinatorWorkspace>>;
