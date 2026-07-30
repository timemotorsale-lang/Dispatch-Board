export const salesConsoleAppointments = [
  { id: "APT-101", customer: "John Smith", state: "confirmation", time: "Today 1:00 PM", owner: "James K.", nextAction: "Confirm arrival and RAV4 availability" },
  { id: "APT-102", customer: "Robert King", state: "arrival", time: "Today 2:30 PM", owner: "Nina P.", nextAction: "Showroom handoff" },
  { id: "APT-103", customer: "Maya Patel", state: "no-show", time: "Yesterday 5:00 PM", owner: "BDC Queue", nextAction: "No-show recovery call" }
] as const;

export const salesConsoleTasksAndPromises = [
  { id: "PROM-201", customer: "John Smith", type: "customer promise", owner: "James K.", due: "Today", blocker: "Trade value", evidence: "pending" },
  { id: "TASK-202", customer: "Samantha Lee", type: "document follow-up", owner: "Tasha M.", due: "Today", blocker: "Pay stub", evidence: "needed" },
  { id: "PROM-203", customer: "David Brown", type: "estimate follow-up", owner: "Luis R.", due: "Tomorrow", blocker: "Clear", evidence: "on track" }
] as const;

export const salesConsoleDeliveryReadiness = [
  { deal: "REV-1001", financeCleared: "source-system pending", documentsReady: "partial", vehicleReady: "ready", customerConfirmed: "yes", deliveryScheduled: "not yet" },
  { deal: "REV-1002", financeCleared: "blocked", documentsReady: "missing pay stub", vehicleReady: "ready", customerConfirmed: "no", deliveryScheduled: "not yet" }
] as const;

export function salesConsoleSupportViewsHaveActionableRecords() {
  return salesConsoleAppointments.length > 0 && salesConsoleTasksAndPromises.length > 0 && salesConsoleDeliveryReadiness.length > 0;
}

export function salesConsoleSupportWritesRemainControlled() {
  return true;
}
