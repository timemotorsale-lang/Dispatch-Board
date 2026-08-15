import type { AuthenticatedUser } from "@/server/auth/store";
import { isRoutePermittedForUser } from "@/server/auth/navigation";
import {
  createUnifiedCrmWorkQueueRepository,
  type UnifiedCrmWorkAppointmentRecord,
  type UnifiedCrmWorkCustomerRecord,
  type UnifiedCrmWorkConcernCaseRecord,
  type UnifiedCrmWorkLeadRecord,
  type UnifiedCrmWorkQueueRepository
} from "@/server/repositories/unified-crm-work-queue-repository";
import { requireUnifiedCrmWorkAccess } from "@/server/unified-crm/work-queue-access";
import {
  UNIFIED_CRM_WORK_QUEUE_CONTRACT_VERSION,
  UnifiedCrmWorkReadError,
  type UnifiedCrmWorkQueueDueState,
  type UnifiedCrmWorkQueueItem,
  type UnifiedCrmWorkQueueReadModel,
  type UnifiedCrmWorkQueueSourceKind,
  type UnifiedCrmWorkTodayItem
} from "@/server/unified-crm/work-queue-contract";
import { buildUnifiedCrmCustomerReturn } from "@/server/unified-crm/opportunity-review-return";

type UnifiedCrmWorkQueueDependencies = {
  canOpenSourceRoute?: ((actor: AuthenticatedUser, route: "/customers/resolutions" | "/sales") => boolean) | undefined;
  now?: () => Date;
  nodeEnv?: string | undefined;
  readMode?: string | undefined;
  repository?: UnifiedCrmWorkQueueRepository;
  shellMode?: string | undefined;
  workMode?: string | undefined;
};

type QueueCandidate = UnifiedCrmWorkQueueItem & {
  dueAtDate: Date | null;
  updatedAtDate: Date;
  rank: number;
};

const SOURCE_LIMIT = 8;
const WORK_QUEUE_TIME_ZONE = "America/Chicago" as const;
const LEAD_SOURCE_ROUTE = "/sales" as const;
const CASE_SOURCE_ROUTE = "/customers/resolutions" as const;
const SOURCE_LABELS: Record<UnifiedCrmWorkQueueSourceKind, string> = {
  appointments: "Appointments",
  leads: "Sales leads",
  cases: "Customer resolution cases",
  customers: "CRM customer follow-ups"
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: WORK_QUEUE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function label(value: string | null | undefined) {
  return (value ?? "Unknown").toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function dateKey(value: Date) {
  return dateKeyFormatter.format(value);
}

function sameDay(left: Date, right: Date) {
  return dateKey(left) === dateKey(right);
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

function customerHref(value: { id: string } | null | undefined) {
  const normalizedId = value?.id?.trim();
  if (!normalizedId || normalizedId.length > 128) return undefined;
  const href = buildUnifiedCrmCustomerReturn(normalizedId, "/crm?view=work");
  return href.startsWith("/crm/customers/") ? href : undefined;
}

function canExposeLinkedCustomer(
  value: {
    archivedAt: Date | null;
    id: string;
    mergedIntoCustomerId: string | null;
    organizationId: string;
    ownerUserId: string | null;
  } | null | undefined,
  input: {
    organizationId: string;
    recordScope: { kind: "ORGANIZATION" } | { kind: "OWNER"; ownerUserId: string };
  }
) {
  if (!value) return false;
  if (value.archivedAt || value.mergedIntoCustomerId) return false;
  if (value.organizationId !== input.organizationId) return false;
  if (input.recordScope.kind === "OWNER" && value.ownerUserId !== input.recordScope.ownerUserId) return false;
  return true;
}

function linkedCustomerLabel(
  value: {
    archivedAt: Date | null;
    customerNumber: string;
    displayName: string;
    id: string;
    mergedIntoCustomerId: string | null;
    organizationId: string;
    ownerUserId: string | null;
  } | null | undefined,
  fallback: string | null | undefined,
  input: {
    organizationId: string;
    recordScope: { kind: "ORGANIZATION" } | { kind: "OWNER"; ownerUserId: string };
  }
) {
  if (canExposeLinkedCustomer(value, input)) {
    return `${value!.displayName} · ${value!.customerNumber}`;
  }
  return fallback?.trim() || "Customer context not recorded";
}

function linkedCustomerHref(
  value: {
    archivedAt: Date | null;
    id: string;
    mergedIntoCustomerId: string | null;
    organizationId: string;
    ownerUserId: string | null;
  } | null | undefined,
  input: {
    organizationId: string;
    recordScope: { kind: "ORGANIZATION" } | { kind: "OWNER"; ownerUserId: string };
  }
) {
  return canExposeLinkedCustomer(value, input) ? customerHref(value) : undefined;
}

function rankSource(kind: QueueCandidate["kind"]) {
  if (kind === "case") return 0;
  if (kind === "lead") return 1;
  if (kind === "appointment") return 2;
  return 3;
}

function rankState(state: UnifiedCrmWorkQueueDueState) {
  if (state === "overdue") return 0;
  if (state === "today") return 1;
  if (state === "upcoming") return 2;
  return 3;
}

function appointmentCustomer(
  appointment: UnifiedCrmWorkAppointmentRecord,
  input: {
    organizationId: string;
    recordScope: { kind: "ORGANIZATION" } | { kind: "OWNER"; ownerUserId: string };
  }
) {
  const participant = appointment.participants[0];
  if (!participant) return "Customer not linked";
  return linkedCustomerLabel(participant.customer, participant.displayNameSnapshot, input);
}

function appointmentCandidate(
  appointment: UnifiedCrmWorkAppointmentRecord,
  now: Date,
  input: {
    organizationId: string;
    recordScope: { kind: "ORGANIZATION" } | { kind: "OWNER"; ownerUserId: string };
  }
): QueueCandidate {
  const due = appointment.startsAt;
  const state = dueState(due, now);
  return {
    id: appointment.id,
    kind: "appointment",
    title: appointment.title,
    customerLabel: appointmentCustomer(appointment, input),
    customerHref: linkedCustomerHref(appointment.participants[0]?.customer, input),
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

function leadCandidate(
  lead: UnifiedCrmWorkLeadRecord,
  now: Date,
  input: {
    organizationId: string;
    recordScope: { kind: "ORGANIZATION" } | { kind: "OWNER"; ownerUserId: string };
  }
): QueueCandidate {
  const due = lead.nextActionAt;
  const state = dueState(due, now);
  return {
    id: lead.id,
    kind: "lead",
    title: `Lead ${lead.leadNumber}`,
    customerLabel: linkedCustomerLabel(lead.customer, null, input),
    customerHref: linkedCustomerHref(lead.customer, input),
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

function caseCandidate(
  customerCase: UnifiedCrmWorkConcernCaseRecord,
  now: Date,
  input: {
    organizationId: string;
    recordScope: { kind: "ORGANIZATION" } | { kind: "OWNER"; ownerUserId: string };
  }
): QueueCandidate {
  const due = customerCase.resolutionDueAt ?? customerCase.dueAt;
  const state = dueState(due, now);
  return {
    id: customerCase.id,
    kind: "case",
    title: `Case ${customerCase.concernNumber}`,
    customerLabel: linkedCustomerLabel(customerCase.customer, null, input),
    customerHref: linkedCustomerHref(customerCase.customer, input),
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

function todayItems(
  appointments: UnifiedCrmWorkAppointmentRecord[],
  now: Date,
  input: {
    organizationId: string;
    recordScope: { kind: "ORGANIZATION" } | { kind: "OWNER"; ownerUserId: string };
  }
): UnifiedCrmWorkTodayItem[] {
  return appointments
    .filter((appointment) => appointment.startsAt && sameDay(appointment.startsAt, now))
    .slice(0, 4)
    .map((appointment) => ({
      id: appointment.id,
      title: appointment.title,
      customerLabel: appointmentCustomer(appointment, input),
      customerHref: linkedCustomerHref(appointment.participants[0]?.customer, input),
      detail: `${label(appointment.bookingStatus)} · ${label(appointment.confirmationStatus)}`,
      startsAt: appointment.startsAt?.toISOString() ?? null,
      sourceHref: `/appointments?view=board&appointment=${encodeURIComponent(appointment.appointmentNumber)}`
    }));
}

function canOpenWorkSource(
  actor: AuthenticatedUser,
  route: "/customers/resolutions" | "/sales",
  evaluator?: (actor: AuthenticatedUser, route: "/customers/resolutions" | "/sales") => boolean
) {
  return evaluator ? evaluator(actor, route) : isRoutePermittedForUser(actor, route);
}

function sourceListLabel(sources: UnifiedCrmWorkQueueSourceKind[]) {
  if (sources.length === 0) return "";
  const labels = sources.map((source) => SOURCE_LABELS[source]);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export async function getUnifiedCrmWorkQueue(
  actor: AuthenticatedUser | null,
  dependencies: UnifiedCrmWorkQueueDependencies = {}
): Promise<UnifiedCrmWorkQueueReadModel> {
  const access = requireUnifiedCrmWorkAccess(actor, {
    nodeEnv: dependencies.nodeEnv ?? process.env.NODE_ENV,
    readMode: dependencies.readMode ?? process.env.UNIFIED_CRM_READ_MODE,
    shellMode: dependencies.shellMode ?? process.env.UNIFIED_CRM_SHELL_MODE,
    workMode: dependencies.workMode ?? process.env.UNIFIED_CRM_WORK_MODE
  });

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
    const queueScope = { organizationId, recordScope: access.recordScope };
    const leadSourceAvailable = canOpenWorkSource(actor!, LEAD_SOURCE_ROUTE, dependencies.canOpenSourceRoute);
    const caseSourceAvailable = canOpenWorkSource(actor!, CASE_SOURCE_ROUTE, dependencies.canOpenSourceRoute);
    const [scheduleViewableOrganizationIds, leads, concernCases, customers] = await Promise.all([
      repository.listScheduleViewableOrganizationIds(actor!.id, now),
      leadSourceAvailable
        ? repository.listLeads({ organizationId, recordScope: access.recordScope, limit: SOURCE_LIMIT })
        : Promise.resolve([]),
      caseSourceAvailable
        ? repository.listConcernCases({ organizationId, recordScope: access.recordScope, limit: SOURCE_LIMIT })
        : Promise.resolve([]),
      repository.listCustomersWithNextAction({ organizationId, recordScope: access.recordScope, limit: SOURCE_LIMIT })
    ]);
    const appointments = scheduleViewableOrganizationIds.includes(organizationId)
      ? await repository.listAppointments({ organizationId, recordScope: access.recordScope, viewerUserId: actor!.id, limit: SOURCE_LIMIT })
      : [];
    const unavailableSources = [
      ...(scheduleViewableOrganizationIds.includes(organizationId) ? [] : ["appointments" as const]),
      ...(leadSourceAvailable ? [] : ["leads" as const]),
      ...(caseSourceAvailable ? [] : ["cases" as const])
    ];
    const visibleLeads = leadSourceAvailable ? leads : [];
    const visibleConcernCases = caseSourceAvailable
      ? concernCases.filter((customerCase) => (
          access.recordScope.kind === "OWNER" || customerCase.managerVisible
        ))
      : [];
    const cappedSources = [
      ...(appointments.length >= SOURCE_LIMIT ? ["appointments" as const] : []),
      ...(visibleLeads.length >= SOURCE_LIMIT ? ["leads" as const] : []),
      ...(visibleConcernCases.length >= SOURCE_LIMIT ? ["cases" as const] : []),
      ...(customers.length >= SOURCE_LIMIT ? ["customers" as const] : [])
    ];
    const sourceStates = [
      {
        source: "appointments" as const,
        status: scheduleViewableOrganizationIds.includes(organizationId) ? "available" as const : "unavailable" as const,
        visibleCount: appointments.length,
        capped: appointments.length >= SOURCE_LIMIT,
        newestRecordUpdatedAt: appointments.length
          ? new Date(Math.max(...appointments.map((appointment) => appointment.updatedAt.getTime()))).toISOString()
          : null
      },
      {
        source: "leads" as const,
        status: leadSourceAvailable ? "available" as const : "unavailable" as const,
        visibleCount: visibleLeads.length,
        capped: visibleLeads.length >= SOURCE_LIMIT,
        newestRecordUpdatedAt: visibleLeads.length
          ? new Date(Math.max(...visibleLeads.map((lead) => lead.updatedAt.getTime()))).toISOString()
          : null
      },
      {
        source: "cases" as const,
        status: caseSourceAvailable ? "available" as const : "unavailable" as const,
        visibleCount: visibleConcernCases.length,
        capped: visibleConcernCases.length >= SOURCE_LIMIT,
        newestRecordUpdatedAt: visibleConcernCases.length
          ? new Date(Math.max(...visibleConcernCases.map((customerCase) => customerCase.updatedAt.getTime()))).toISOString()
          : null
      },
      {
        source: "customers" as const,
        status: "available" as const,
        visibleCount: customers.length,
        capped: customers.length >= SOURCE_LIMIT,
        newestRecordUpdatedAt: customers.length
          ? new Date(Math.max(...customers.map((customer) => customer.updatedAt.getTime()))).toISOString()
          : null
      }
    ];

    const items = [
      ...appointments.map((appointment) => appointmentCandidate(appointment, now, queueScope)),
      ...visibleLeads.map((lead) => leadCandidate(lead, now, queueScope)),
      ...visibleConcernCases.map((customerCase) => caseCandidate(customerCase, now, queueScope)),
      ...customers.map((customer) => customerCandidate(customer, now))
    ].sort(sortCandidates);

    const observedAt = now.toISOString();
    const newestRecordUpdatedAt = items.length
      ? new Date(Math.max(...items.map((item) => item.updatedAtDate.getTime()))).toISOString()
      : null;
    const freshnessSuffix = newestRecordUpdatedAt
      ? ` Latest visible source update: ${newestRecordUpdatedAt}.`
      : " No permitted source records are currently visible.";
    const cappedSourceDetail = cappedSources.length
      ? ` Visible reads are currently capped for ${sourceListLabel(cappedSources)}.`
      : "";
    const unavailableSourceDetail = unavailableSources.length
      ? ` ${sourceListLabel(unavailableSources)} ${unavailableSources.length === 1 ? "is" : "are"} unavailable in this workspace.`
      : "";

    return {
      contractVersion: UNIFIED_CRM_WORK_QUEUE_CONTRACT_VERSION,
      state: items.length ? "READY" : "EMPTY",
      visibility: access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned",
      generatedAt: observedAt,
      explanation: {
        ordering: "Items are ordered overdue first, then due today, upcoming, and waiting. Ties break by due time, source class, latest update, and record id.",
        freshness: `Freshness observed ${observedAt} from live read-only source records.${freshnessSuffix}${cappedSourceDetail}${unavailableSourceDetail}`,
        drillThrough: `Open the governed source record first. Lead and case rows appear only when that source workspace is permitted. Open Customer 360 only when a safe linked customer route exists. Today uses ${WORK_QUEUE_TIME_ZONE}.`
      },
      source: {
        authority: "AGGREGATED_CRM_WORK",
        label: "CRM Work projection",
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
      coverage: {
        isPartial: cappedSources.length > 0 || unavailableSources.length > 0,
        cappedSources,
        unavailableSources,
        sourceLimit: SOURCE_LIMIT,
        sourceStates
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
        ,
        now,
        queueScope
      )
    };
  } catch (error) {
    if (error instanceof UnifiedCrmWorkReadError) throw error;
    throw new UnifiedCrmWorkReadError("CRM_WORK_SOURCE_UNAVAILABLE", "CRM work is temporarily unavailable.", { cause: error });
  }
}
