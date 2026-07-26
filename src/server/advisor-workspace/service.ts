import type { AuthenticatedUser } from "@/server/auth/store";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";

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
  const activeHandoffs = openOrders.items.filter((order) => ["WAITING", "BLOCKED"].includes(order.operatingState) || /approval|customer|authorization|handoff|promise/i.test(order.nextAction));

  return {
    generatedAt: now.toISOString(),
    advisor: { id: actor.id, name: actor.name },
    counts: {
      activeRepairOrders: openOrders.total,
      availableAppointments: appointments.length,
      customers: options.customers.length,
      todaysArrivals: todaysArrivals.length,
      waitingCheckIn: waitingCheckIn.length,
      handoffs: activeHandoffs.length
    },
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
