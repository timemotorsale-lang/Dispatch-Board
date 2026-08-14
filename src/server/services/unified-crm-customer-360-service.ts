import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";
import {
  createUnifiedCrmCustomer360Repository,
  type UnifiedCrmCustomer360Record,
  type UnifiedCrmCustomer360Repository
} from "@/server/repositories/unified-crm-customer-360-repository";
import {
  createUnifiedCrmCustomerTimelineRepository,
  type UnifiedCrmCustomerTimelineRepository
} from "@/server/repositories/unified-crm-customer-timeline-repository";
import {
  createUnifiedCrmCustomerReadRepository,
  type UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import {
  requireUnifiedCrmCustomer360Access,
  type UnifiedCrmCustomer360AccessOptions
} from "@/server/unified-crm/customer-360-access";
import {
  UNIFIED_CRM_CUSTOMER_360_CONTRACT_VERSION,
  UnifiedCrmCustomer360Error,
  type UnifiedCrmCustomer360Appointment,
  type UnifiedCrmCustomer360Contact,
  type UnifiedCrmCustomer360Note,
  type UnifiedCrmCustomer360ReadModel,
  type UnifiedCrmCustomer360TimelineItem
} from "@/server/unified-crm/customer-360-contract";

type UnifiedCrmCustomer360Dependencies = UnifiedCrmCustomer360AccessOptions & {
  now?: () => Date;
  repository?: UnifiedCrmCustomer360Repository;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
  timelineRepository?: UnifiedCrmCustomerTimelineRepository;
};

function normalizeCustomerId(value: unknown) {
  if (typeof value !== "string") {
    throw new UnifiedCrmCustomer360Error("INVALID_CUSTOMER_ID", "Customer identifier is invalid.");
  }
  const id = value.trim();
  if (!id || id.length > 200) {
    throw new UnifiedCrmCustomer360Error("INVALID_CUSTOMER_ID", "Customer identifier is invalid.");
  }
  return id;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `••••${digits.slice(-4)}` : "••••";
}

function maskEmail(value: string) {
  const [local = "", domain = ""] = value.trim().split("@", 2);
  if (!domain) return "••••";
  const parts = domain.split(".");
  const domainName = parts.shift() ?? "";
  const suffix = parts.length ? `.${parts.at(-1)}` : "";
  return `${local.slice(0, 1) || "•"}•••@${domainName.slice(0, 1) || "•"}•••${suffix}`;
}

function contacts(record: UnifiedCrmCustomer360Record): UnifiedCrmCustomer360Contact[] {
  const result: UnifiedCrmCustomer360Contact[] = [];
  for (const point of record.contactPoints) {
    const type = point.type.trim().toUpperCase();
    if (type !== "PHONE" && type !== "EMAIL") continue;
    result.push({
      type,
      maskedValue: type === "PHONE" ? maskPhone(point.value) : maskEmail(point.value),
      isPrimary: point.isPrimary,
      source: "CONTACT_POINT"
    });
  }
  const types = new Set(result.map((point) => point.type));
  if (!types.has("PHONE") && record.phoneNumber) {
    result.push({ type: "PHONE", maskedValue: maskPhone(record.phoneNumber), isPrimary: true, source: "CUSTOMER_LEGACY" });
  }
  if (!types.has("EMAIL") && record.email) {
    result.push({ type: "EMAIL", maskedValue: maskEmail(record.email), isPrimary: true, source: "CUSTOMER_LEGACY" });
  }
  return result;
}

function appointments(record: UnifiedCrmCustomer360Record): UnifiedCrmCustomer360Appointment[] {
  const seen = new Set<string>();
  return record.appointmentParticipants.flatMap(({ appointment }) => {
    if (seen.has(appointment.id)) return [];
    seen.add(appointment.id);
    return [{
      id: appointment.id,
      title: appointment.title,
      startsAt: appointment.startsAt?.toISOString() ?? null,
      bookingStatus: appointment.bookingStatus,
      confirmationStatus: appointment.confirmationStatus,
      attendanceStatus: appointment.attendanceStatus,
      sourceHref: "/appointments"
    }];
  });
}

function notes(record: UnifiedCrmCustomer360Record, canViewRestricted: boolean): UnifiedCrmCustomer360Note[] {
  return record.notes
    .filter((note) => note.visibility !== "RESTRICTED" || canViewRestricted)
    .map((note) => ({
      id: note.id,
      authorName: note.authorUser.name,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      visibility: note.visibility as UnifiedCrmCustomer360Note["visibility"]
    }));
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function timelineItems(input: {
  model: Awaited<ReturnType<UnifiedCrmCustomerTimelineRepository["listTimeline"]>>;
}): UnifiedCrmCustomer360TimelineItem[] {
  const items: UnifiedCrmCustomer360TimelineItem[] = [
    ...input.model.interactions.map((interaction) => ({
      id: `interaction:${interaction.id}`,
      kind: "interaction" as const,
      title: `${label(interaction.channel)} ${label(interaction.direction)}`,
      detail: [interaction.summary, interaction.outcome, interaction.nextStep ? `Next: ${interaction.nextStep}` : null].filter(Boolean).join(" · "),
      occurredAt: interaction.occurredAt.toISOString(),
      actorName: interaction.actorUser?.name ?? null,
      sourceLabel: "Customer interactions",
      sourceHref: "/customers"
    })),
    ...input.model.activityEvents.map((event) => ({
      id: `activity:${event.id}`,
      kind: "task-event" as const,
      title: event.task ? `${label(event.eventType)} · ${event.task.title}` : event.concernCase ? `${label(event.eventType)} · ${event.concernCase.concernNumber}` : label(event.eventType),
      detail: event.message,
      occurredAt: event.createdAt.toISOString(),
      actorName: event.actorUser?.name ?? null,
      sourceLabel: event.task ? "Tasks" : "Customer resolutions",
      sourceHref: event.task ? `/tasks/${encodeURIComponent(event.task.id)}` : `/customers/resolutions?caseId=${encodeURIComponent(event.concernCase?.concernNumber ?? "")}`
    })),
    ...input.model.appointmentHistoryEvents.map((event) => ({
      id: `appointment:${event.id}`,
      kind: "appointment-event" as const,
      title: `${label(event.eventType)} · ${event.appointment.title}`,
      detail: event.message,
      occurredAt: event.occurredAt.toISOString(),
      actorName: event.actorUser?.name ?? null,
      sourceLabel: "Appointments",
      sourceHref: `/appointments?view=board&appointment=${encodeURIComponent(event.appointment.appointmentNumber)}`
    })),
    ...input.model.leadEvents.map((lead) => ({
      id: `lead:${lead.id}`,
      kind: "lead-event" as const,
      title: `Lead ${lead.leadNumber} created`,
      detail: [label(lead.stage), lead.vehicleInterest ?? "General interest", lead.ownerUser.name].join(" · "),
      occurredAt: lead.createdAt.toISOString(),
      actorName: lead.ownerUser.name,
      sourceLabel: "Sales",
      sourceHref: "/sales"
    })),
    ...input.model.caseEvents.map((customerCase) => ({
      id: `case:${customerCase.id}`,
      kind: "case-event" as const,
      title: `${customerCase.concernNumber} opened`,
      detail: [customerCase.title, label(customerCase.status), label(customerCase.priority)].join(" · "),
      occurredAt: customerCase.createdAt.toISOString(),
      actorName: customerCase.assignedOwner?.name ?? null,
      sourceLabel: "Customer resolutions",
      sourceHref: `/customers/resolutions?caseId=${encodeURIComponent(customerCase.concernNumber)}`
    })),
    ...input.model.promiseEvents.map((promise) => ({
      id: `promise:${promise.id}`,
      kind: "promise-event" as const,
      title: `Promise ${label(promise.status)}`,
      detail: [
        label(promise.promiseType),
        `Due ${promise.dueAt.toISOString()}`,
        promise.concernCase.concernNumber
      ].join(" · "),
      occurredAt: (promise.fulfilledAt ?? promise.promisedAt).toISOString(),
      actorName: promise.fulfilledByUser?.name ?? promise.ownerUser.name,
      sourceLabel: "Customer resolutions",
      sourceHref: `/customers/resolutions?caseId=${encodeURIComponent(promise.concernCase.concernNumber)}`
    })),
    ...(input.model.crmDomainEvents ?? []).map((event) => {
      const payload = event.payload as {
        dueAt?: string | null;
        note?: string | null;
        operation?: "SET" | "COMPLETE";
        previousNextActionAt?: string | null;
      };
      const title = event.eventType === "CRM_CUSTOMER_NEXT_ACTION_COMPLETED"
        ? "Next action completed"
        : event.eventType === "CRM_CUSTOMER_NEXT_ACTION_RESCHEDULED"
          ? "Next action rescheduled"
          : "Next action set";
      const detail = [
        payload.note,
        payload.dueAt ? `Due ${payload.dueAt}` : payload.operation === "COMPLETE" ? "No next action remains scheduled." : null
      ].filter(Boolean).join(" · ");
      return {
        id: `crm-event:${event.id}`,
        kind: "commitment-event" as const,
        title,
        detail: detail || "CRM customer follow-up was updated.",
        occurredAt: event.occurredAt.toISOString(),
        actorName: null,
        sourceLabel: "Unified CRM",
        sourceHref: "/crm?view=work"
      };
    })
  ];

  return items
    .sort((left, right) => {
      const byDate = new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
      return byDate !== 0 ? byDate : right.id.localeCompare(left.id);
    })
    .slice(0, 20);
}

export async function getUnifiedCrmCustomer360(
  actor: AuthenticatedUser | null,
  customerIdValue: unknown,
  dependencies: UnifiedCrmCustomer360Dependencies = {}
): Promise<UnifiedCrmCustomer360ReadModel> {
  const { recordScope } = requireUnifiedCrmCustomer360Access(actor, dependencies);
  const customerId = normalizeCustomerId(customerIdValue);
  const now = dependencies.now?.() ?? new Date();
  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const repository = dependencies.repository ?? createUnifiedCrmCustomer360Repository();
  const timelineRepository = dependencies.timelineRepository ?? createUnifiedCrmCustomerTimelineRepository();
  let organizationIds: string[];
  let record: UnifiedCrmCustomer360Record | null;
  let timeline;
  try {
    organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmCustomer360Error(
        "ORGANIZATION_SCOPE_UNAVAILABLE",
        "Customer details are not available for this viewer."
      );
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmCustomer360Error(
        "ORGANIZATION_SCOPE_AMBIGUOUS",
        "Select one authorized organization before opening customer details."
      );
    }
    [record, timeline] = await Promise.all([
      repository.findCustomer({ customerId, organizationId: organizationIds[0], recordScope }),
      timelineRepository.listTimeline({ customerId, organizationId: organizationIds[0], limit: 20, recordScope })
    ]);
  } catch (error) {
    if (error instanceof UnifiedCrmCustomer360Error) throw error;
    throw new UnifiedCrmCustomer360Error(
      "CUSTOMER_SOURCE_UNAVAILABLE",
      "Customer details are temporarily unavailable.",
      { cause: error }
    );
  }
  if (!record) {
    throw new UnifiedCrmCustomer360Error("CUSTOMER_NOT_AVAILABLE", "Customer details are not available.");
  }

  const observedAt = now.toISOString();
  const canViewRestricted = evaluateUnifiedCrmCapability(actor, "crm.sensitive.view").allowed;
  return {
    contractVersion: UNIFIED_CRM_CUSTOMER_360_CONTRACT_VERSION,
    state: "READY",
    visibility: recordScope.kind === "ORGANIZATION" ? "organization" : "owned",
    generatedAt: observedAt,
    source: {
      authority: "CUSTOMERS",
      label: "Customers",
      href: `/customers/${encodeURIComponent(record.id)}`,
      readMode: "LIVE_CANONICAL",
      observedAt
    },
    freshness: { status: "CURRENT", observedAt, sourceRecordUpdatedAt: record.updatedAt.toISOString() },
    identity: {
      id: record.id,
      customerNumber: record.customerNumber,
      displayName: record.displayName,
      status: record.status.toLowerCase() as UnifiedCrmCustomer360ReadModel["identity"]["status"],
      customerSince: record.createdAt.toISOString()
    },
    owner: record.ownerUser,
    contacts: contacts(record),
    preferences: {
      preferredContactMethod: record.preferredContactMethod,
      preferredContactTime: record.preferredContactTime,
      languageCode: record.languageCode
    },
    permissions: {
      canCreateRestrictedNote: canViewRestricted
    },
    relationship: {
      lastInteractionAt: record.lastInteractionAt?.toISOString() ?? null,
      nextActionAt: record.nextActionAt?.toISOString() ?? null
    },
    vehicles: record.vehicleRelationships.map(({ vehicle, ...relationship }) => ({
      id: vehicle.id,
      label: [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber,
      status: vehicle.status,
      relationshipType: relationship.relationshipType,
      effectiveFrom: relationship.effectiveFrom.toISOString(),
      effectiveTo: relationship.effectiveTo?.toISOString() ?? null,
      sourceHref: `/vehicles/360/${encodeURIComponent(vehicle.id)}`
    })),
    appointments: appointments(record),
    notes: notes(record, canViewRestricted),
    timeline: {
      itemCount: timelineItems({ model: timeline }).length,
      items: timelineItems({ model: timeline })
    },
    sourceLenses: {
      leads: record.leads.filter((lead) =>
        recordScope.kind === "ORGANIZATION" || lead.ownerUser.id === recordScope.ownerUserId
      ).map((lead) => ({
        id: lead.id,
        leadNumber: lead.leadNumber,
        stage: lead.stage,
        sourceCode: lead.sourceCode,
        ownerName: lead.ownerUser.name,
        vehicleInterest: lead.vehicleInterest,
        nextActionCode: lead.nextActionCode,
        nextActionAt: lead.nextActionAt.toISOString(),
        sourceHref: "/sales"
      })),
      cases: record.concernCases.filter((customerCase) =>
        recordScope.kind === "ORGANIZATION" || customerCase.assignedOwner?.id === recordScope.ownerUserId
      ).map((customerCase) => ({
        id: customerCase.id,
        caseNumber: customerCase.concernNumber,
        title: customerCase.title,
        category: customerCase.category,
        priority: customerCase.priority,
        status: customerCase.status,
        ownerName: customerCase.assignedOwner?.name ?? "Unassigned",
        dueAt: customerCase.dueAt.toISOString(),
        resolutionDueAt: customerCase.resolutionDueAt?.toISOString() ?? null,
        slaStage: customerCase.slaStage,
        sourceHref: `/customers/resolutions?caseId=${encodeURIComponent(customerCase.concernNumber)}`
      }))
    }
  };
}
