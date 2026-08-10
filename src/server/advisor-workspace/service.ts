import type { AuthenticatedUser } from "@/server/auth/store";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";

type AdvisorActionKind = "AUTHORIZATION" | "PROMISE_RISK" | "PARTS_DELAY" | "CUSTOMER_UPDATE" | "HANDOFF" | "FOLLOW_UP_SCHEDULED" | "TECHNICIAN_CLARIFICATION";

function advisorExceptionCodes(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function activeVendorWork(
  order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number]
) {
  const works = order.vendorWorks ?? [];
  return works.find((work) => !["COMPLETED", "CANCELLED"].includes(work.status)) ?? works[0] ?? null;
}

function advisorActionFor(order: Awaited<ReturnType<typeof listRepairOrders>>["items"][number]) {
  const nextAction = order.nextAction.toLowerCase();
  const stage = order.stage.toString();
  const operatingState = order.operatingState.toString();
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

  if (/approval|authorization|authorize|estimate/i.test(order.nextAction)) {
    return {
      kind: "AUTHORIZATION" as AdvisorActionKind,
      label: "Authorization needed",
      priority: 1,
      reason: "Customer decision may be required before work can continue."
    };
  }

  if (order.age.overdue || /promise|due|overdue|late|completion|ready time/i.test(order.nextAction)) {
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
    .sort((left, right) => left.action.priority - right.action.priority || left.order.targetAt.getTime() - right.order.targetAt.getTime());
  const activeHandoffs = actionQueue.filter(({ action }) => !["CUSTOMER_UPDATE", "FOLLOW_UP_SCHEDULED"].includes(action.kind));
  const needsAttention = actionQueue.filter(({ action }) => ["AUTHORIZATION", "PROMISE_RISK", "HANDOFF", "CUSTOMER_UPDATE"].includes(action.kind));
  const waitingOnOthers = actionQueue.filter(({ action }) => ["PARTS_DELAY", "TECHNICIAN_CLARIFICATION", "FOLLOW_UP_SCHEDULED"].includes(action.kind));
  const inbox = openOrders.items.flatMap((order) => order.advisorUpdates.map((update) => {
    const exceptionCodes = advisorExceptionCodes(update.exceptionCodes);
    const audience = exceptionCodes.includes("MANAGER_REVIEW")
      ? "MANAGEMENT" as const
      : update.contactDirection === "INTERNAL" || update.contactChannel === "INTERNAL" || exceptionCodes.some((code) => ["TECHNICIAN_CLARIFICATION", "WAITING_PARTS"].includes(code))
        ? "TEAM" as const
        : "CUSTOMER" as const;
    const needsResponse = update.contactDirection === "INBOUND" || exceptionCodes.length > 0 || audience !== "CUSTOMER" && update.authorUser.id !== actor.id;
    return {
      id: update.id,
      audience,
      authorName: update.authorUser.name,
      channel: update.contactChannel,
      customerName: order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal vehicle",
      direction: update.contactDirection,
      dueAt: update.nextContactAt?.toISOString() ?? null,
      exceptionCodes,
      needsResponse,
      occurredAt: update.occurredAt.toISOString(),
      preview: audience === "CUSTOMER" ? update.customerVisibleSummary : update.internalNotes ?? update.contactOutcome,
      repairOrderId: order.id,
      repairOrderNumber: order.repairOrderNumber,
      statusCode: update.statusCode,
      subject: update.contactOutcome,
      transportState: audience === "CUSTOMER" ? "RECORDED_CONTACT" as const : audience === "MANAGEMENT" ? "ESCALATION_RECORDED" as const : "SHARED_IN_REPAIR_ORDER" as const,
      vehicleLabel: [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber
    };
  })).sort((left, right) => Number(right.needsResponse) - Number(left.needsResponse) || new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  return {
    generatedAt: now.toISOString(),
    advisor: { id: actor.id, name: actor.name },
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
      customerName: order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal vehicle",
      currentLocation: activeVendorWork(order)?.currentLocation ?? order.location.name,
      hasActiveVendorWork: Boolean(activeVendorWork(order)),
      nextAction: order.nextAction,
      operatingState: order.operatingState,
      repairOrderNumber: order.repairOrderNumber,
      stage: order.stage,
      targetAt: order.targetAt.toISOString(),
      unresolvedPartDemandCount: order.partDemands.filter((part) => part.quantityReserved < part.quantityRequired).length,
      vehicleLabel: [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber,
      vendorStatus: activeVendorWork(order)?.status ?? null,
      overdue: order.age.overdue,
      latestAdvisorUpdate: order.advisorUpdates[0]
        ? {
          authorName: order.advisorUpdates[0].authorUser.name,
          occurredAt: order.advisorUpdates[0].occurredAt.toISOString(),
          statusCode: order.advisorUpdates[0].statusCode,
          summary: order.advisorUpdates[0].customerVisibleSummary
        }
        : null
    })),
    appointments: waitingCheckIn.slice(0, 6).map((appointment) => ({
      id: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      customerName: appointment.customer?.displayName ?? "Customer not linked",
      email: appointment.customer?.email ?? null,
      phoneNumber: appointment.customer?.phoneNumber ?? null,
      startsAt: appointment.startsAt?.toISOString() ?? null,
      title: appointment.title,
      vehicleLabel: appointment.vehicle
        ? [appointment.vehicle.year, appointment.vehicle.make, appointment.vehicle.model].filter(Boolean).join(" ") || appointment.vehicle.vehicleNumber
        : "Vehicle not linked"
    })),
    repairOrders: openOrders.items.slice(0, 8).map((order) => ({
      id: order.id,
      age: order.age,
      customerName: order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal vehicle",
      nextAction: order.nextAction,
      operatingState: order.operatingState,
      repairOrderNumber: order.repairOrderNumber,
      stage: order.stage,
      targetAt: order.targetAt.toISOString(),
      vehicleLabel: [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber
    }))
  };
}

export type ServiceAdvisorWorkspaceModel = Awaited<ReturnType<typeof getServiceAdvisorWorkspace>>;
