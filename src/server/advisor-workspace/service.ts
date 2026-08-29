import type { AuthenticatedUser } from "@/server/auth/store";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";
import { getCooWorkbook } from "@/server/services/workday-workbook";

type AdvisorActionKind = "AUTHORIZATION" | "PROMISE_RISK" | "PARTS_DELAY" | "CUSTOMER_UPDATE" | "HANDOFF" | "FOLLOW_UP_SCHEDULED" | "TECHNICIAN_CLARIFICATION";

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

export async function getServiceAdvisorWorkspace(actor: AuthenticatedUser) {
  const [options, openOrders] = await Promise.all([
    getRepairOrderCreateOptions(actor),
    listRepairOrders(actor, { page: 1, pageSize: 12 })
  ]);
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const appointments = options.appointments.map((appointment) => ({
    ...appointment,
      customer: appointment.participants[0]?.customer ?? null,
      vehicle: appointment.vehicles[0]?.vehicle ?? null
  }));
  const todaysArrivals = appointments.filter((appointment) => appointment.startsAt?.toISOString().slice(0, 10) === todayKey);
  const waitingCheckIn = appointments.filter((appointment) => !appointment.startsAt || appointment.startsAt >= new Date(now.getTime() - 12 * 60 * 60 * 1000));
  const actionQueue = openOrders.items
    .map((order) => ({ order, action: advisorActionFor(order) }))
    .sort((left, right) => left.action.priority - right.action.priority || ((left.order.targetAt instanceof Date ? left.order.targetAt.getTime() : 0) - (right.order.targetAt instanceof Date ? right.order.targetAt.getTime() : 0)));
  const activeHandoffs = actionQueue.filter(({ action }) => !["CUSTOMER_UPDATE", "FOLLOW_UP_SCHEDULED"].includes(action.kind));
  const needsAttention = actionQueue.filter(({ action }) => ["AUTHORIZATION", "PROMISE_RISK", "HANDOFF", "CUSTOMER_UPDATE"].includes(action.kind));
  const waitingOnOthers = actionQueue.filter(({ action }) => ["PARTS_DELAY", "TECHNICIAN_CLARIFICATION", "FOLLOW_UP_SCHEDULED"].includes(action.kind));
  const approvalCount = actionQueue.filter(({ action }) => action.kind === "AUTHORIZATION").length;
  const handoffCount = actionQueue.filter(({ action }) => action.kind === "HANDOFF").length;
  const reportExceptions = needsAttention.length + waitingOnOthers.length;
  const workbook = await getCooWorkbook(actor, todayKey, {
    approvalCount,
    handoffCount,
    reportExceptions
  });
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
      vehicleLabel: vehicleLabelFor(order)
    };
  })).sort((left, right) => Number(right.needsResponse) - Number(left.needsResponse) || new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  return {
    generatedAt: now.toISOString(),
    advisor: { id: actor.id, name: actor.name },
    workbook,
    counts: {
      activeRepairOrders: openOrders.total,
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
      vehicleLabel: appointment.vehicle
        ? [appointment.vehicle.year, appointment.vehicle.make, appointment.vehicle.model].filter(Boolean).join(" ") || appointment.vehicle.vehicleNumber
        : "Vehicle not linked"
    })),
    repairOrders: openOrders.items.slice(0, 8).map((order) => ({
      id: order.id,
      age: order.age,
      customerName: customerLabelFor(order),
      nextAction: safeText(order.nextAction, "Next action not recorded"),
      operatingState: safeText(order.operatingState, "UNKNOWN"),
      repairOrderNumber: order.repairOrderNumber,
      stage: safeText(order.stage, "UNKNOWN"),
      targetAt: safeDateIso(order.targetAt) ?? new Date(0).toISOString(),
      vehicleLabel: vehicleLabelFor(order)
    }))
  };
}

export type ServiceAdvisorWorkspaceModel = Awaited<ReturnType<typeof getServiceAdvisorWorkspace>>;
