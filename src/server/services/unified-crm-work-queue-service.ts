import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import {
  createUnifiedCrmWorkQueueRepository,
  type UnifiedCrmWorkAppointmentRecord,
  type UnifiedCrmWorkCustomerRecord,
  type UnifiedCrmWorkConcernCaseRecord,
  type UnifiedCrmWorkLeadRecord,
  type UnifiedCrmWorkQueueRepository,
  type UnifiedCrmWorkTaskRecord
} from "@/server/repositories/unified-crm-work-queue-repository";
import { resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import {
  UNIFIED_CRM_WORK_QUEUE_CONTRACT_VERSION,
  UnifiedCrmWorkReadError,
  type UnifiedCrmWorkQueueDueState,
  type UnifiedCrmWorkQueueItem,
  type UnifiedCrmWorkQueueReadModel,
  type UnifiedCrmWorkReadMode,
  type UnifiedCrmWorkTodayItem
} from "@/server/unified-crm/work-queue-contract";
import { buildUnifiedCrmCustomerReturn } from "@/server/unified-crm/opportunity-review-return";

type UnifiedCrmWorkQueueDependencies = {
  now?: () => Date;
  nodeEnv?: string | undefined;
  readMode?: string | undefined;
  repository?: UnifiedCrmWorkQueueRepository;
};

type QueueCandidate = UnifiedCrmWorkQueueItem & {
  dueAtDate: Date | null;
  updatedAtDate: Date;
  rank: number;
};

const SOURCE_LIMIT = 8;

function label(value: string | null | undefined) {
  return (value ?? "Unknown").toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function sameDay(left: Date, right: Date) {
  return left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate();
}

function dueState(date: Date | null, now: Date): UnifiedCrmWorkQueueDueState {
  if (!date) return "waiting";
  if (date.getTime() < now.getTime()) return "overdue";
  if (sameDay(date, now)) return "today";
  return "upcoming";
}

function dueLabel(date: Date | null, state: UnifiedCrmWorkQueueDueState) {
  if (!date) return "Waiting on source";
  if (state === "overdue") return "Overdue";
  if (state === "today") return "Today";
  return "Upcoming";
}

function reasonForTask(task: UnifiedCrmWorkTaskRecord, state: UnifiedCrmWorkQueueDueState) {
  if (task.blockerReason) return task.blockerReason;
  if (task.status === "READY_FOR_REVIEW") return "Needs manager review before it can be closed.";
  if (task.status === "WAITING_ON_APPROVAL") return "Waiting on an approval before work can continue.";
  if (task.status === "WAITING_ON_PARTS") return "Waiting on parts before the next step can happen.";
  if (state === "overdue") return "This assigned task is past due.";
  if (state === "today") return "This assigned task is due today.";
  return "This assigned task is the next governed step.";
}

function reasonForAppointment(appointment: UnifiedCrmWorkAppointmentRecord, state: UnifiedCrmWorkQueueDueState) {
  if (appointment.confirmationStatus === "NOT_SENT" || appointment.confirmationStatus === "PENDING") {
    return "This appointment still needs confirmation.";
  }
  if (appointment.attendanceStatus === "NO_SHOW") return "This appointment needs a no-show follow-up.";
  if (state === "overdue") return "This appointment start time has already passed.";
  if (state === "today") return "This appointment needs attention today.";
  return "This appointment is coming up soon.";
}

function reasonForLead(lead: UnifiedCrmWorkLeadRecord, state: UnifiedCrmWorkQueueDueState) {
  if (state === "overdue") return "The next lead action is overdue.";
  if (state === "today") return "The next lead action is due today.";
  return "The next lead action is scheduled and ready.";
}

function reasonForCase(customerCase: UnifiedCrmWorkConcernCaseRecord, state: UnifiedCrmWorkQueueDueState) {
  if (customerCase.slaStage !== "HEALTHY") return `SLA is ${label(customerCase.slaStage)}.`;
  if (state === "overdue") return "The case due time has passed.";
  if (state === "today") return "The case is due today.";
  return "This case still needs follow-through.";
}

function customerLabel(value: { displayName: string; customerNumber: string } | null | undefined, fallback: string | null | undefined) {
  if (value) return `${value.displayName} · ${value.customerNumber}`;
  return fallback?.trim() || "Customer context not recorded";
}

function customerHref(value: { id: string } | null | undefined) {
  if (!value?.id?.trim()) return undefined;
  return buildUnifiedCrmCustomerReturn(value.id, "/crm?view=work");
}

function rankSource(kind: QueueCandidate["kind"]) {
  if (kind === "task") return 0;
  if (kind === "case") return 1;
  if (kind === "lead") return 2;
  return 3;
}

function rankState(state: UnifiedCrmWorkQueueDueState) {
  if (state === "overdue") return 0;
  if (state === "today") return 1;
  if (state === "upcoming") return 2;
  return 3;
}

function taskCandidate(task: UnifiedCrmWorkTaskRecord, now: Date): QueueCandidate {
  const due = task.dueAt;
  const state = dueState(due, now);
  return {
    id: task.id,
    kind: "task",
    title: task.title,
    customerLabel: customerLabel(task.customer, task.customerReference),
    customerHref: customerHref(task.customer),
    ownerName: task.assignedUser.name,
    sourceLabel: "Tasks",
    sourceHref: `/tasks/${encodeURIComponent(task.id)}`,
    primaryActionLabel: task.status === "READY_FOR_REVIEW" ? "Review task" : "Open task",
    dueAt: due.toISOString(),
    dueLabel: dueLabel(due, state),
    dueState: state,
    stageLabel: label(task.status),
    reason: reasonForTask(task, state),
    history: [
      `Status: ${label(task.status)}`,
      `Area: ${label(task.workflowArea)}`,
      task.vehicleReference ? `Vehicle: ${task.vehicleReference}` : `Priority: ${label(task.priority)}`
    ],
    updatedAt: task.updatedAt.toISOString(),
    dueAtDate: due,
    updatedAtDate: task.updatedAt,
    rank: rankState(state)
  };
}

function appointmentCustomer(appointment: UnifiedCrmWorkAppointmentRecord) {
  const participant = appointment.participants[0];
  if (!participant) return "Customer not linked";
  if (participant.customer) return `${participant.customer.displayName} · ${participant.customer.customerNumber}`;
  return participant.displayNameSnapshot;
}

function appointmentCandidate(appointment: UnifiedCrmWorkAppointmentRecord, now: Date): QueueCandidate {
  const due = appointment.startsAt;
  const state = dueState(due, now);
  return {
    id: appointment.id,
    kind: "appointment",
    title: appointment.title,
    customerLabel: appointmentCustomer(appointment),
    customerHref: customerHref(appointment.participants[0]?.customer),
    ownerName: appointment.ownerUser?.name ?? "Unassigned",
    sourceLabel: "Appointments",
    sourceHref: `/appointments?view=board&appointment=${encodeURIComponent(appointment.appointmentNumber)}`,
    primaryActionLabel: appointment.confirmationStatus === "CONFIRMED" ? "Open appointment" : "Review appointment",
    dueAt: due?.toISOString() ?? null,
    dueLabel: dueLabel(due, state),
    dueState: state,
    stageLabel: label(appointment.bookingStatus),
    reason: reasonForAppointment(appointment, state),
    history: [
      `Confirmation: ${label(appointment.confirmationStatus)}`,
      `Attendance: ${label(appointment.attendanceStatus)}`,
      `Execution: ${label(appointment.executionStatus)}`
    ],
    updatedAt: appointment.updatedAt.toISOString(),
    dueAtDate: due,
    updatedAtDate: appointment.updatedAt,
    rank: rankState(state)
  };
}

function leadCandidate(lead: UnifiedCrmWorkLeadRecord, now: Date): QueueCandidate {
  const due = lead.nextActionAt;
  const state = dueState(due, now);
  return {
    id: lead.id,
    kind: "lead",
    title: `Lead ${lead.leadNumber}`,
    customerLabel: customerLabel(lead.customer, null),
    customerHref: customerHref(lead.customer),
    ownerName: lead.ownerUser.name,
    sourceLabel: "Sales",
    sourceHref: "/sales",
    primaryActionLabel: "Open lead queue",
    dueAt: due.toISOString(),
    dueLabel: dueLabel(due, state),
    dueState: state,
    stageLabel: label(lead.stage),
    reason: reasonForLead(lead, state),
    history: [
      `Stage: ${label(lead.stage)}`,
      `Next action: ${label(lead.nextActionCode)}`,
      `Owner: ${lead.ownerUser.name}`
    ],
    updatedAt: lead.updatedAt.toISOString(),
    dueAtDate: due,
    updatedAtDate: lead.updatedAt,
    rank: rankState(state)
  };
}

function caseCandidate(customerCase: UnifiedCrmWorkConcernCaseRecord, now: Date): QueueCandidate {
  const due = customerCase.resolutionDueAt ?? customerCase.dueAt;
  const state = dueState(due, now);
  return {
    id: customerCase.id,
    kind: "case",
    title: `${customerCase.concernNumber} · ${customerCase.title}`,
    customerLabel: customerLabel(customerCase.customer, null),
    customerHref: customerHref(customerCase.customer),
    ownerName: customerCase.assignedOwner?.name ?? "Unassigned",
    sourceLabel: "Customer resolutions",
    sourceHref: `/customers/resolutions?caseId=${encodeURIComponent(customerCase.concernNumber)}`,
    primaryActionLabel: "Open case",
    dueAt: due.toISOString(),
    dueLabel: dueLabel(due, state),
    dueState: state,
    stageLabel: label(customerCase.status),
    reason: reasonForCase(customerCase, state),
    history: [
      `Priority: ${label(customerCase.priority)}`,
      `SLA: ${label(customerCase.slaStage)}`,
      `Owner: ${customerCase.assignedOwner?.name ?? "Unassigned"}`
    ],
    updatedAt: customerCase.updatedAt.toISOString(),
    dueAtDate: due,
    updatedAtDate: customerCase.updatedAt,
    rank: rankState(state)
  };
}

function customerCandidate(customer: UnifiedCrmWorkCustomerRecord, now: Date): QueueCandidate {
  const due = customer.nextActionAt;
  const state = dueState(due, now);
  return {
    id: customer.id,
    kind: "customer",
    title: `Follow up with ${customer.displayName}`,
    customerLabel: `${customer.displayName} · ${customer.customerNumber}`,
    customerHref: buildUnifiedCrmCustomerReturn(customer.id, "/crm?view=work"),
    ownerName: customer.ownerUser?.name ?? "Unassigned",
    sourceLabel: "Unified CRM",
    sourceHref: buildUnifiedCrmCustomerReturn(customer.id, "/crm?view=work"),
    primaryActionLabel: "Open customer",
    dueAt: due?.toISOString() ?? null,
    dueLabel: dueLabel(due, state),
    dueState: state,
    stageLabel: label(customer.status),
    reason: state === "overdue"
      ? "This CRM follow-up is overdue."
      : state === "today"
        ? "This CRM follow-up is due today."
        : "This customer has a scheduled CRM follow-up.",
    history: [
      `Status: ${label(customer.status)}`,
      `Owner: ${customer.ownerUser?.name ?? "Unassigned"}`,
      "Source: Unified CRM"
    ],
    updatedAt: customer.updatedAt.toISOString(),
    dueAtDate: due,
    updatedAtDate: customer.updatedAt,
    rank: rankState(state)
  };
}

function sortCandidates(left: QueueCandidate, right: QueueCandidate) {
  if (left.rank !== right.rank) return left.rank - right.rank;
  const leftDue = left.dueAtDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightDue = right.dueAtDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (leftDue !== rightDue) return leftDue - rightDue;
  const leftSource = rankSource(left.kind);
  const rightSource = rankSource(right.kind);
  if (leftSource !== rightSource) return leftSource - rightSource;
  const updated = right.updatedAtDate.getTime() - left.updatedAtDate.getTime();
  if (updated !== 0) return updated;
  return left.id.localeCompare(right.id);
}

function todayItems(appointments: UnifiedCrmWorkAppointmentRecord[]): UnifiedCrmWorkTodayItem[] {
  return appointments.slice(0, 4).map((appointment) => ({
    id: appointment.id,
    title: appointment.title,
    customerLabel: appointmentCustomer(appointment),
    customerHref: customerHref(appointment.participants[0]?.customer),
    detail: `${label(appointment.bookingStatus)} · ${label(appointment.confirmationStatus)}`,
    startsAt: appointment.startsAt?.toISOString() ?? null,
    sourceHref: `/appointments?view=board&appointment=${encodeURIComponent(appointment.appointmentNumber)}`
  }));
}

export async function getUnifiedCrmWorkQueue(
  actor: AuthenticatedUser | null,
  dependencies: UnifiedCrmWorkQueueDependencies = {}
): Promise<UnifiedCrmWorkQueueReadModel> {
  const readMode = resolveUnifiedCrmCustomerReadMode({
    nodeEnv: dependencies.nodeEnv ?? process.env.NODE_ENV,
    readMode: dependencies.readMode ?? process.env.UNIFIED_CRM_READ_MODE
  }) as UnifiedCrmWorkReadMode;

  if (readMode !== "REVIEW") {
    throw new UnifiedCrmWorkReadError("CRM_WORK_OFF", "CRM work is not available.");
  }

  const recordScope = (() => {
    try {
      return requireUnifiedCrmCustomerReadPolicy(actor);
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        const code = String((error as { code?: string }).code);
        if (code === "AUTHENTICATION_REQUIRED") {
          throw new UnifiedCrmWorkReadError("AUTHENTICATION_REQUIRED", "CRM work is not available for this viewer.");
        }
      }
      throw new UnifiedCrmWorkReadError("CRM_WORK_NOT_AUTHORIZED", "CRM work is not available for this viewer.");
    }
  })();

  const now = dependencies.now?.() ?? new Date();
  const repository = dependencies.repository ?? createUnifiedCrmWorkQueueRepository();
  try {
    const organizationIds = await repository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmWorkReadError("ORGANIZATION_SCOPE_UNAVAILABLE", "CRM work is not available for this viewer.");
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmWorkReadError("ORGANIZATION_SCOPE_AMBIGUOUS", "Select one authorized organization before opening CRM work.");
    }

    const organizationId = organizationIds[0];
    const [tasks, appointments, leads, concernCases, customers] = await Promise.all([
      repository.listTasks(actor!.id, SOURCE_LIMIT),
      repository.listAppointments({ organizationId, recordScope, viewerUserId: actor!.id, limit: SOURCE_LIMIT }),
      repository.listLeads({ organizationId, recordScope, limit: SOURCE_LIMIT }),
      repository.listConcernCases({ organizationId, recordScope, limit: SOURCE_LIMIT }),
      repository.listCustomersWithNextAction({ organizationId, recordScope, limit: SOURCE_LIMIT })
    ]);

    const items = [
      ...tasks.map((task) => taskCandidate(task, now)),
      ...appointments.map((appointment) => appointmentCandidate(appointment, now)),
      ...leads.map((lead) => leadCandidate(lead, now)),
      ...concernCases.map((customerCase) => caseCandidate(customerCase, now)),
      ...customers.map((customer) => customerCandidate(customer, now))
    ].sort(sortCandidates);

    const observedAt = now.toISOString();
    const newestRecordUpdatedAt = items.length
      ? new Date(Math.max(...items.map((item) => item.updatedAtDate.getTime()))).toISOString()
      : null;

    return {
      contractVersion: UNIFIED_CRM_WORK_QUEUE_CONTRACT_VERSION,
      state: items.length ? "READY" : "EMPTY",
      visibility: recordScope.kind === "ORGANIZATION" ? "organization" : "owned",
      generatedAt: observedAt,
      source: {
        authority: "UNIFIED_CRM",
        label: "CRM Work",
        href: "/crm?view=work",
        readMode: "LIVE_AGGREGATED",
        observedAt
      },
      freshness: {
        status: "CURRENT",
        observedAt,
        newestRecordUpdatedAt
      },
      summary: {
        totalCount: items.length,
        overdueCount: items.filter((item) => item.dueState === "overdue").length,
        todayCount: items.filter((item) => item.dueState === "today").length,
        waitingCount: items.filter((item) => item.dueState === "waiting").length,
        appointmentCount: appointments.length
      },
      items: items.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        customerLabel: item.customerLabel,
        customerHref: item.customerHref,
        ownerName: item.ownerName,
        sourceLabel: item.sourceLabel,
        sourceHref: item.sourceHref,
        primaryActionLabel: item.primaryActionLabel,
        dueAt: item.dueAt,
        dueLabel: item.dueLabel,
        dueState: item.dueState,
        stageLabel: item.stageLabel,
        reason: item.reason,
        history: item.history,
        updatedAt: item.updatedAt
      })),
      today: todayItems(
        appointments
          .filter((appointment) => appointment.startsAt)
          .sort((left, right) => (left.startsAt?.getTime() ?? 0) - (right.startsAt?.getTime() ?? 0))
      )
    };
  } catch (error) {
    if (error instanceof UnifiedCrmWorkReadError) throw error;
    throw new UnifiedCrmWorkReadError("CRM_WORK_SOURCE_UNAVAILABLE", "CRM work is temporarily unavailable.", { cause: error });
  }
}
