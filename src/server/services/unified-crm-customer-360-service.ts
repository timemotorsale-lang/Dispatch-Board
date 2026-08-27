import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";
import {
  createUnifiedCrmCustomer360Repository,
  type UnifiedCrmCustomer360OpportunityDispatchLinkRecord,
  type UnifiedCrmCustomer360OpportunityQuoteLinkRecord,
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
  canLogUnifiedCrmCustomerInteraction
} from "@/server/unified-crm/customer-interaction-access";
import {
  canCreateUnifiedCrmCustomerNote
} from "@/server/unified-crm/customer-note-access";
import {
  canManageUnifiedCrmCustomerNextAction
} from "@/server/unified-crm/customer-next-action-access";
import { canCreateUnifiedCrmCustomerTaskBridge } from "@/server/unified-crm/customer-task-bridge-access";
import {
  UNIFIED_CRM_CUSTOMER_360_CONTRACT_VERSION,
  UnifiedCrmCustomer360Error,
  type UnifiedCrmCustomer360Appointment,
  type UnifiedCrmCustomer360CommunicationActionReadiness,
  type UnifiedCrmCustomer360Contact,
  type UnifiedCrmCustomer360CommunicationTimelineLens,
  type UnifiedCrmCustomer360Note,
  type UnifiedCrmCustomer360OpportunityLens,
  type UnifiedCrmCustomer360ReadModel,
  type UnifiedCrmCustomer360TimelineItem
} from "@/server/unified-crm/customer-360-contract";
import { buildUnifiedCrmOpportunityReviewHref } from "@/server/unified-crm/opportunity-workspace-orientation";
import { normalizeUnifiedCrmOpportunityId } from "@/server/validation/unified-crm-opportunity";

type UnifiedCrmCustomer360Dependencies = UnifiedCrmCustomer360AccessOptions & {
  bridgeMode?: unknown;
  commandMode?: unknown;
  interactionCommandMode?: unknown;
  noteCommandMode?: unknown;
  now?: () => Date;
  repository?: UnifiedCrmCustomer360Repository;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
  timelineRepository?: UnifiedCrmCustomerTimelineRepository;
};

const CUSTOMER_TIMELINE_LIMIT = 20;

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

function nextActionState(nextActionAt: Date | null, now: Date): UnifiedCrmCustomer360ReadModel["relationship"]["nextActionState"] {
  if (!nextActionAt) return "NONE";
  if (nextActionAt.getTime() < now.getTime()) return "OVERDUE";

  const sameCalendarDay =
    nextActionAt.getUTCFullYear() === now.getUTCFullYear() &&
    nextActionAt.getUTCMonth() === now.getUTCMonth() &&
    nextActionAt.getUTCDate() === now.getUTCDate();

  return sameCalendarDay ? "DUE_TODAY" : "SCHEDULED";
}

function opportunityLenses(
  record: UnifiedCrmCustomer360Record,
  dispatchLinksByOpportunity: Map<string, UnifiedCrmCustomer360OpportunityDispatchLinkRecord[]>,
  quoteLinksByOpportunity: Map<string, UnifiedCrmCustomer360OpportunityQuoteLinkRecord[]>
): UnifiedCrmCustomer360OpportunityLens[] {
  return record.unifiedCrmOpportunities.flatMap((opportunity) => {
    try {
      const opportunityId = normalizeUnifiedCrmOpportunityId(opportunity.opportunityNumber);
      const dispatchLinks = (dispatchLinksByOpportunity.get(opportunity.opportunityNumber) ?? [])
        .flatMap((link) => {
          if (!link.repairOrderId || !link.repairOrderNumberSnapshot) return [];
          return [{
            href: link.targetKind === "REPAIR_JOB" && link.repairJobId
              ? `/vehicles/shop-dispatch?repairJobId=${encodeURIComponent(link.repairJobId)}`
              : `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(link.repairOrderId)}`,
            repairJobId: link.repairJobId,
            repairJobNumber: link.repairJobNumberSnapshot,
            repairOrderId: link.repairOrderId,
            repairOrderNumber: link.repairOrderNumberSnapshot,
            state: link.archivedAt ? "ARCHIVED" as const : "ACTIVE" as const,
            targetKind: link.targetKind === "REPAIR_JOB" ? "REPAIR_JOB" as const : "REPAIR_ORDER" as const,
            title: link.titleSnapshot,
            version: link.targetVersionSnapshot
          }];
        });
      const quoteLinks = (quoteLinksByOpportunity.get(opportunity.opportunityNumber) ?? []).map((link) => ({
        approvalAmountCents: link.approvalAmountCents,
        approvalDiscountCents: link.approvalDiscountCents,
        approvalStatus: link.approvalStatus ?? "NONE" as const,
        href: `/crm/quotes/${encodeURIComponent(link.quoteId)}/versions`,
        latestVersionNumber: link.latestVersionNumber,
        quoteId: link.quoteId,
        quoteNumber: link.quoteNumber,
        state: link.state
      }));
      return [{
        dispatchLinkCount: dispatchLinks.length,
        dispatchLinks,
        quoteCount: quoteLinks.length,
        quoteLinks,
        id: opportunityId,
        opportunityNumber: opportunityId,
        stage: opportunity.stage,
        title: opportunity.title,
        ownerName: opportunity.ownerUser?.name ?? "Unassigned",
        customerLabel: `${record.displayName} · ${record.customerNumber}`,
        summary: opportunity.summary?.trim() || "This persisted opportunity is available in read-only mode.",
        updatedAt: opportunity.updatedAt.toISOString(),
        href: buildUnifiedCrmOpportunityReviewHref("detail", opportunityId),
        state: "LIVE_READ_ONLY" as const
      }];
    } catch {
      return [];
    }
  });
}

function opportunityLensObservation(
  lenses: UnifiedCrmCustomer360OpportunityLens[],
  visibility: "organization" | "owned"
) {
  const visibilityLabel = visibility === "organization" ? "organization review" : "owned review";
  const dispatchLinkCount = lenses.reduce((total, lens) => total + lens.dispatchLinkCount, 0);
  const quoteLinkCount = lenses.reduce((total, lens) => total + (lens.quoteCount ?? 0), 0);
  const newestVisibleRecordUpdatedAt = lenses.length
    ? new Date(Math.max(...lenses.map((lens) => new Date(lens.updatedAt).getTime()))).toISOString()
    : null;

  return {
    detail: lenses.length
      ? `Only same-scope persisted opportunities linked to this customer are shown for ${visibilityLabel}. ${dispatchLinkCount} linked Dispatch record(s)${quoteLinkCount ? ` and ${quoteLinkCount} quote record(s)` : ""} are reconciled from ${quoteLinkCount ? "governed CRM records" : "opportunity bridge records"}. Lifecycle movement remains off.`
      : `No same-scope persisted read-only opportunity linked to this customer is visible right now for ${visibilityLabel}. Continue with held opportunity review surfaces until one is available.`,
    dispatchLinkCount,
    quoteLinkCount,
    freshnessLabel: newestVisibleRecordUpdatedAt
      ? `Newest visible persisted opportunity update observed at ${newestVisibleRecordUpdatedAt}.`
      : "No visible persisted opportunity update is available yet.",
    newestVisibleRecordUpdatedAt,
    state: lenses.length ? "READY" as const : "EMPTY" as const,
    visibleRecordCount: lenses.length
  };
}

function timelineItems(input: {
  model: Awaited<ReturnType<UnifiedCrmCustomerTimelineRepository["listTimeline"]>>;
}): UnifiedCrmCustomer360TimelineItem[] {
  const items: UnifiedCrmCustomer360TimelineItem[] = [
    ...input.model.interactions.map((interaction) => ({
      id: `interaction:${interaction.id}`,
      correlationKey: `interaction:${interaction.id}`,
      kind: "interaction" as const,
      title: `${label(interaction.channel)} ${label(interaction.direction)}`,
      detail: [interaction.summary, interaction.outcome, interaction.nextStep ? `Next: ${interaction.nextStep}` : null].filter(Boolean).join(" · "),
      occurredAt: interaction.occurredAt.toISOString(),
      actorName: interaction.actorUser?.name ?? null,
      sourceLabel: "Customer interactions",
      sourceHref: "/customers",
      sourceRecordId: interaction.id
    })),
    ...input.model.activityEvents.map((event) => ({
      id: `activity:${event.id}`,
      correlationKey: event.task ? `task:${event.task.id}` : event.concernCase ? `case:${event.concernCase.id}` : `activity:${event.id}`,
      kind: "task-event" as const,
      title: event.task ? `${label(event.eventType)} · ${event.task.title}` : event.concernCase ? `${label(event.eventType)} · ${event.concernCase.concernNumber}` : label(event.eventType),
      detail: event.message,
      occurredAt: event.createdAt.toISOString(),
      actorName: event.actorUser?.name ?? null,
      sourceLabel: event.task ? "Tasks" : "Customer resolutions",
      sourceHref: event.task ? `/tasks/${encodeURIComponent(event.task.id)}` : `/customers/resolutions?caseId=${encodeURIComponent(event.concernCase?.concernNumber ?? "")}`,
      sourceRecordId: event.task?.id ?? event.concernCase?.id ?? event.id
    })),
    ...input.model.appointmentHistoryEvents.map((event) => ({
      id: `appointment:${event.id}`,
      correlationKey: `appointment:${event.appointment.id}`,
      kind: "appointment-event" as const,
      title: `${label(event.eventType)} · ${event.appointment.title}`,
      detail: event.message,
      occurredAt: event.occurredAt.toISOString(),
      actorName: event.actorUser?.name ?? null,
      sourceLabel: "Appointments",
      sourceHref: `/appointments?view=board&appointment=${encodeURIComponent(event.appointment.appointmentNumber)}`,
      sourceRecordId: event.appointment.id
    })),
    ...input.model.leadEvents.map((lead) => ({
      id: `lead:${lead.id}`,
      correlationKey: `lead:${lead.id}`,
      kind: "lead-event" as const,
      title: `Lead ${lead.leadNumber} created`,
      detail: [label(lead.stage), lead.vehicleInterest ?? "General interest", lead.ownerUser.name].join(" · "),
      occurredAt: lead.createdAt.toISOString(),
      actorName: lead.ownerUser.name,
      sourceLabel: "Sales",
      sourceHref: "/sales",
      sourceRecordId: lead.id
    })),
    ...input.model.caseEvents.map((customerCase) => ({
      id: `case:${customerCase.id}`,
      correlationKey: `case:${customerCase.id}`,
      kind: "case-event" as const,
      title: `${customerCase.concernNumber} opened`,
      detail: [customerCase.title, label(customerCase.status), label(customerCase.priority)].join(" · "),
      occurredAt: customerCase.createdAt.toISOString(),
      actorName: customerCase.assignedOwner?.name ?? null,
      sourceLabel: "Customer resolutions",
      sourceHref: `/customers/resolutions?caseId=${encodeURIComponent(customerCase.concernNumber)}`,
      sourceRecordId: customerCase.id
    })),
    ...input.model.promiseEvents.map((promise) => ({
      id: `promise:${promise.id}`,
      correlationKey: `promise:${promise.id}`,
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
      sourceHref: `/customers/resolutions?caseId=${encodeURIComponent(promise.concernCase.concernNumber)}`,
      sourceRecordId: promise.id
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
        correlationKey: `crm-event:${event.id}`,
        kind: "commitment-event" as const,
        title,
        detail: detail || "CRM customer follow-up was updated.",
        occurredAt: event.occurredAt.toISOString(),
        actorName: null,
        sourceLabel: "Unified CRM",
        sourceHref: "/crm?view=work",
        sourceRecordId: event.id
      };
    })
  ];

  return items
    .sort((left, right) => {
      const byDate = new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
      return byDate !== 0 ? byDate : right.id.localeCompare(left.id);
    })
    .slice(0, input.model.page.limit);
}

function communicationTimelineLens(items: UnifiedCrmCustomer360TimelineItem[]): UnifiedCrmCustomer360CommunicationTimelineLens {
  const communicationItems = items.filter((item) => item.kind === "interaction");
  const buckets = new Map<UnifiedCrmCustomer360CommunicationTimelineLens["channels"][number]["label"], UnifiedCrmCustomer360TimelineItem[]>();
  for (const item of communicationItems) {
    const title = item.title.toLowerCase();
    const channel = title.includes("phone")
      ? "Phone"
      : title.includes("email")
        ? "Email"
        : title.includes("sms") || title.includes("text")
          ? "Sms"
          : "Other";
    buckets.set(channel, [...(buckets.get(channel) ?? []), item]);
  }
  const channels = Array.from(buckets.entries()).map(([channelLabel, channelItems]) => ({
    label: channelLabel,
    count: channelItems.length,
    latestOutcomeAt: channelItems[0]?.occurredAt ?? null
  }));
  const latestOutcomeAt = communicationItems[0]?.occurredAt ?? null;
  return {
    state: communicationItems.length ? "READY" : "EMPTY",
    posture: "READ_ONLY",
    detail: communicationItems.length
      ? "Permitted manual communication outcomes are visible here for context only. Raw phone numbers, raw email values, message bodies, and provider payloads are not exposed."
      : "No permitted manual communication outcome is visible for this customer yet. Use the governed manual outcome form or source workflow when a staff touchpoint occurs.",
    visibleOutcomeCount: communicationItems.length,
    latestOutcomeAt,
    channels,
    fallback: {
      label: "Manual timeline review",
      href: "#timeline-heading",
      reason: "Review the relationship timeline when communication outcomes need context; no external communication is sent from this lens."
    }
  };
}

function communicationActionReadiness(input: {
  contacts: UnifiedCrmCustomer360Contact[];
  canLogInteraction: boolean;
}): UnifiedCrmCustomer360CommunicationActionReadiness {
  const hasPhone = input.contacts.some((contact) => contact.type === "PHONE");
  const hasEmail = input.contacts.some((contact) => contact.type === "EMAIL");
  const manualState = input.canLogInteraction ? "READY_MANUAL" : "NOT_AUTHORIZED";
  const manualDetail = input.canLogInteraction
    ? "Record the outcome after staff contact. No provider call, email, or text is sent from Customer 360."
    : "Your role or this environment cannot record manual contact outcomes from Customer 360.";
  const channels: UnifiedCrmCustomer360CommunicationActionReadiness["channels"] = [
    {
      id: "phone",
      label: "Call",
      state: hasPhone ? manualState : "NO_CONTACT",
      primaryActionLabel: hasPhone && input.canLogInteraction ? "Log call outcome" : "Review customer source",
      href: hasPhone && input.canLogInteraction ? "#interaction-form-heading" : "#communication-timeline-lens-heading",
      detail: hasPhone ? manualDetail : "No permitted phone contact is visible here. Review the source record before calling."
    },
    {
      id: "email",
      label: "Email",
      state: hasEmail ? "PROVIDER_HELD" : "NO_CONTACT",
      primaryActionLabel: hasEmail ? "Draft only" : "Review customer source",
      href: hasEmail ? "/api/crm/v1/communications/email-drafts" : "#communication-timeline-lens-heading",
      detail: hasEmail
        ? "Email provider sending is held. Staff can prepare review-only drafts, then use the approved manual channel outside CRM."
        : "No permitted email contact is visible here. Review the source record before emailing."
    },
    {
      id: "sms",
      label: "Text",
      state: hasPhone ? "PROVIDER_HELD" : "NO_CONTACT",
      primaryActionLabel: hasPhone ? "Review text templates" : "Review customer source",
      href: hasPhone ? "/api/crm/v1/communications/sms-templates" : "#communication-timeline-lens-heading",
      detail: hasPhone
        ? "SMS delivery is held until provider, consent, quiet-hours, and cost controls are approved."
        : "No permitted phone contact is visible here, so SMS readiness is unavailable."
    }
  ];
  const actionable = channels.some((channel) => channel.state === "READY_MANUAL");
  const providerHeld = channels.some((channel) => channel.state === "PROVIDER_HELD");
  return {
    state: actionable ? "READY" : providerHeld ? "HELD" : "UNAVAILABLE",
    posture: actionable ? "MANUAL_ONLY" : providerHeld ? "PROVIDER_HELD" : "NO_CONTACT",
    channels,
    fallback: {
      label: "Log manual outcome",
      href: "#interaction-form-heading",
      reason: "When provider actions are held, keep continuity by recording the human touchpoint after it happens."
    }
  };
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
  let opportunityDispatchLinks: UnifiedCrmCustomer360OpportunityDispatchLinkRecord[] = [];
  let opportunityQuoteLinks: UnifiedCrmCustomer360OpportunityQuoteLinkRecord[] = [];
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
    record = await repository.findCustomer({ customerId, organizationId: organizationIds[0], recordScope });
    if (record) {
      const quoteRepository = repository as Partial<Pick<UnifiedCrmCustomer360Repository, "listOpportunityQuoteLinks">>;
      [opportunityDispatchLinks, opportunityQuoteLinks] = await Promise.all([
        repository.listOpportunityDispatchLinks({ customerId, organizationId: organizationIds[0], recordScope }),
        quoteRepository.listOpportunityQuoteLinks
          ? quoteRepository.listOpportunityQuoteLinks({ customerId, organizationId: organizationIds[0], recordScope })
          : Promise.resolve([])
      ]);
    }
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

  try {
    timeline = await timelineRepository.listTimeline({
      customerId,
      organizationId: organizationIds[0],
      limit: CUSTOMER_TIMELINE_LIMIT,
      recordScope
    });
  } catch (error) {
    throw new UnifiedCrmCustomer360Error(
      "CUSTOMER_SOURCE_UNAVAILABLE",
      "Customer details are temporarily unavailable.",
      { cause: error }
    );
  }

  const observedAt = now.toISOString();
  const canViewRestricted = evaluateUnifiedCrmCapability(actor, "crm.sensitive.view").allowed;
  const visibleContacts = contacts(record);
  const canCreateGovernedTask = canCreateUnifiedCrmCustomerTaskBridge(actor, {
    bridgeMode: dependencies.bridgeMode ?? process.env.UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_MODE,
    nodeEnv: dependencies.nodeEnv ?? process.env.NODE_ENV,
    readMode: dependencies.readMode ?? process.env.UNIFIED_CRM_CUSTOMER_READ_MODE,
    shellMode: dependencies.shellMode ?? process.env.UNIFIED_CRM_SHELL_MODE
  });
  const canLogInteraction = canLogUnifiedCrmCustomerInteraction(actor, {
    commandMode: dependencies.interactionCommandMode ?? process.env.UNIFIED_CRM_CUSTOMER_INTERACTION_MODE,
    nodeEnv: dependencies.nodeEnv ?? process.env.NODE_ENV,
    readMode: dependencies.readMode ?? process.env.UNIFIED_CRM_CUSTOMER_READ_MODE,
    shellMode: dependencies.shellMode ?? process.env.UNIFIED_CRM_SHELL_MODE
  });
  const canCreateNote = canCreateUnifiedCrmCustomerNote(actor, {
    commandMode: dependencies.noteCommandMode ?? process.env.UNIFIED_CRM_CUSTOMER_NOTE_MODE,
    nodeEnv: dependencies.nodeEnv ?? process.env.NODE_ENV,
    readMode: dependencies.readMode ?? process.env.UNIFIED_CRM_CUSTOMER_READ_MODE,
    shellMode: dependencies.shellMode ?? process.env.UNIFIED_CRM_SHELL_MODE
  });
  const canManageNextAction = canManageUnifiedCrmCustomerNextAction(actor, record.ownerUser?.id ?? null, {
    commandMode: dependencies.commandMode ?? process.env.UNIFIED_CRM_CUSTOMER_NEXT_ACTION_MODE,
    nodeEnv: dependencies.nodeEnv ?? process.env.NODE_ENV,
    readMode: dependencies.readMode ?? process.env.UNIFIED_CRM_CUSTOMER_READ_MODE,
    shellMode: dependencies.shellMode ?? process.env.UNIFIED_CRM_SHELL_MODE
  });
  const timelineView = timelineItems({ model: timeline });
  const newestTimelineItem = timelineView[0]?.occurredAt ?? null;
  const visibility = recordScope.kind === "ORGANIZATION" ? "organization" : "owned";
  const dispatchLinksByOpportunity = new Map<string, UnifiedCrmCustomer360OpportunityDispatchLinkRecord[]>();
  for (const link of opportunityDispatchLinks) {
    const existing = dispatchLinksByOpportunity.get(link.opportunityNumber) ?? [];
    existing.push(link);
    dispatchLinksByOpportunity.set(link.opportunityNumber, existing);
  }
  const quoteLinksByOpportunity = new Map<string, UnifiedCrmCustomer360OpportunityQuoteLinkRecord[]>();
  for (const link of opportunityQuoteLinks) {
    const existing = quoteLinksByOpportunity.get(link.opportunityNumber) ?? [];
    existing.push(link);
    quoteLinksByOpportunity.set(link.opportunityNumber, existing);
  }
  const persistedOpportunityLenses = opportunityLenses(record, dispatchLinksByOpportunity, quoteLinksByOpportunity);

  return {
    contractVersion: UNIFIED_CRM_CUSTOMER_360_CONTRACT_VERSION,
    state: "READY",
    visibility,
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
    contacts: visibleContacts,
    preferences: {
      preferredContactMethod: record.preferredContactMethod,
      preferredContactTime: record.preferredContactTime,
      languageCode: record.languageCode
    },
    permissions: {
      canLogInteraction,
      canCreateNote,
      canCreateGovernedTask,
      canManageNextAction,
      canCreateRestrictedNote: canViewRestricted
    },
    relationship: {
      lastInteractionAt: record.lastInteractionAt?.toISOString() ?? null,
      nextActionAt: record.nextActionAt?.toISOString() ?? null,
      nextActionState: nextActionState(record.nextActionAt, now)
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
      state: timelineView.length ? "READY" : "EMPTY",
      itemCount: timelineView.length,
      emptyMessage: "No permitted customer activity has been recorded in this timeline yet.",
      freshness: {
        observedAt,
        newestOccurredAt: newestTimelineItem
      },
      items: timelineView,
      page: {
        limit: timeline.page.limit,
        hasMore: timeline.page.hasMore
      }
    },
    communicationTimelineLens: communicationTimelineLens(timelineView),
    communicationActionReadiness: communicationActionReadiness({ contacts: visibleContacts, canLogInteraction }),
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
    },
    opportunityLensObservation: opportunityLensObservation(persistedOpportunityLenses, visibility),
    opportunityLenses: persistedOpportunityLenses
  };
}
