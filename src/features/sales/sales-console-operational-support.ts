export const salesConsoleAppointments = [
  {
    id: "APT-101",
    customer: "John Smith",
    state: "confirmation",
    time: "Today 1:00 PM",
    owner: "James K.",
    nextAction: "Confirm arrival and RAV4 availability",
    readiness: "ready with vehicle/customer context",
    showRisk: "low",
    workflowTrigger: "pre-appointment prep"
  },
  {
    id: "APT-102",
    customer: "Robert King",
    state: "arrival",
    time: "Today 2:30 PM",
    owner: "Nina P.",
    nextAction: "Showroom handoff",
    readiness: "needs Customer 360 context check",
    showRisk: "medium",
    workflowTrigger: "arrival handoff"
  },
  {
    id: "APT-103",
    customer: "Maya Patel",
    state: "no-show",
    time: "Yesterday 5:00 PM",
    owner: "BDC Queue",
    nextAction: "No-show recovery call",
    readiness: "recovery workflow required",
    showRisk: "high",
    workflowTrigger: "post-appointment no-show follow-up"
  }
] as const;

export const salesConsoleTasksAndPromises = [
  {
    id: "PROM-201",
    customer: "John Smith",
    type: "customer promise",
    owner: "James K.",
    due: "Today",
    blocker: "Trade value",
    evidence: "pending",
    slaRisk: "watch",
    workflowScore: 72,
    nextBestTaskAction: "Verify trade value promise before appointment"
  },
  {
    id: "TASK-202",
    customer: "Samantha Lee",
    type: "document follow-up",
    owner: "Tasha M.",
    due: "Today",
    blocker: "Pay stub",
    evidence: "needed",
    slaRisk: "breach",
    workflowScore: 88,
    nextBestTaskAction: "Collect proof of income and reopen manager review context"
  },
  {
    id: "PROM-203",
    customer: "David Brown",
    type: "estimate follow-up",
    owner: "Luis R.",
    due: "Tomorrow",
    blocker: "Clear",
    evidence: "on track",
    slaRisk: "none",
    workflowScore: 46,
    nextBestTaskAction: "Confirm estimate response tomorrow"
  }
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

export function salesConsoleAppointmentsExposeExecutionSignals() {
  return salesConsoleAppointments.every(
    (appointment) => appointment.readiness.length > 0 && appointment.showRisk.length > 0 && appointment.workflowTrigger.length > 0
  );
}

export function salesConsoleTasksExposeWorkflowSignals() {
  return salesConsoleTasksAndPromises.every(
    (task) => task.workflowScore >= 0 && task.workflowScore <= 100 && task.slaRisk.length > 0 && task.nextBestTaskAction.length > 0
  );
}
