import type { AppointmentTemplateDefinition } from "@/server/appointments/appointment-template-domain";
import {
  searchAppointmentAvailability,
  type AppointmentAvailabilitySearchInput,
  type AppointmentAvailabilitySlot
} from "@/server/appointments/appointment-availability-search-service";

export const APPOINTMENT_UNSCHEDULED_REQUEST_STATUSES = [
  "OPEN",
  "CANDIDATES_FOUND",
  "PROMOTION_READY",
  "PROMOTED",
  "DEFERRED",
  "CANCELLED"
] as const;

export const APPOINTMENT_UNSCHEDULED_REQUEST_SOURCES = [
  "MANUAL",
  "TASK",
  "AUTOMATION",
  "CUSTOMER_REQUEST",
  "WAITLIST"
] as const;

export const APPOINTMENT_UNSCHEDULED_REQUEST_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT"
] as const;

export const APPOINTMENT_WAITLIST_PROMOTION_MODES = [
  "CREATE_DRAFT_FOR_REVIEW",
  "REQUEST_MANAGER_REVIEW"
] as const;

export type AppointmentUnscheduledRequestStatus =
  (typeof APPOINTMENT_UNSCHEDULED_REQUEST_STATUSES)[number];
export type AppointmentUnscheduledRequestSource =
  (typeof APPOINTMENT_UNSCHEDULED_REQUEST_SOURCES)[number];
export type AppointmentUnscheduledRequestPriority =
  (typeof APPOINTMENT_UNSCHEDULED_REQUEST_PRIORITIES)[number];
export type AppointmentWaitlistPromotionMode =
  (typeof APPOINTMENT_WAITLIST_PROMOTION_MODES)[number];

export type AppointmentWaitlistPermission = {
  canViewSchedule: boolean;
  canCreateDraft: boolean;
  canRequestManagerReview: boolean;
  reason?: string | null;
};

export type AppointmentUnscheduledRequestInput = {
  requestId: string;
  organizationId: string;
  locationId: string;
  template: AppointmentTemplateDefinition;
  source: AppointmentUnscheduledRequestSource;
  priority?: AppointmentUnscheduledRequestPriority;
  requestedByUserId?: string | null;
  ownerUserId?: string | null;
  sourceTaskId?: string | null;
  requestedContextFields?: string[];
  reasonCode: string;
  reasonNotes: string;
  createdAt: Date;
  permission: AppointmentWaitlistPermission;
};

export type AppointmentUnscheduledRequest = {
  requestId: string;
  organizationId: string;
  locationId: string;
  templateCode: string;
  templateVersion: number;
  source: AppointmentUnscheduledRequestSource;
  status: AppointmentUnscheduledRequestStatus;
  priority: AppointmentUnscheduledRequestPriority;
  requestedByUserId: string | null;
  ownerUserId: string | null;
  sourceTaskId: string | null;
  requestedContextFields: string[];
  missingContextFields: string[];
  reasonCode: string;
  reasonNotes: string;
  createdAt: Date;
  isReadyForCandidateSearch: boolean;
  isSilentlyScheduled: false;
};

export type AppointmentWaitlistCandidate = {
  requestId: string;
  candidateRank: number;
  slot: AppointmentAvailabilitySlot;
  score: number;
  explanation: string[];
};

export type AppointmentWaitlistCandidateResult = {
  request: AppointmentUnscheduledRequest;
  status: Extract<AppointmentUnscheduledRequestStatus, "OPEN" | "CANDIDATES_FOUND">;
  candidates: AppointmentWaitlistCandidate[];
  searchedCandidateCount: number;
  noSilentScheduling: true;
};

export type AppointmentWaitlistPromotionPlan = {
  requestId: string;
  mode: AppointmentWaitlistPromotionMode;
  status: Extract<AppointmentUnscheduledRequestStatus, "PROMOTION_READY">;
  selectedCandidate: AppointmentWaitlistCandidate;
  reasonCode: string;
  reasonNotes: string;
  createsScheduledAppointment: false;
  requiresExplicitCommit: true;
  nextCommandType: "CREATE_DRAFT" | "MANAGER_REVIEW";
};

function requiredText(value: string | null | undefined, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function uniqueTrimmed(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function assertPermission(permission: AppointmentWaitlistPermission) {
  if (!permission.canViewSchedule) {
    throw new Error(permission.reason?.trim() || "Waitlist request requires schedule access.");
  }
}

function getPriorityScore(priority: AppointmentUnscheduledRequestPriority) {
  switch (priority) {
    case "URGENT":
      return 400;
    case "HIGH":
      return 300;
    case "NORMAL":
      return 200;
    case "LOW":
      return 100;
  }
}

function getSlotScore(slot: AppointmentAvailabilitySlot) {
  const statusScore = slot.status === "AVAILABLE" ? 1000 : 500;
  const warningPenalty = slot.warningResult.unresolvedWarnings.length * 25;

  return statusScore - warningPenalty;
}

function getCandidateExplanation(slot: AppointmentAvailabilitySlot) {
  const explanation = [
    slot.status === "AVAILABLE"
      ? "Candidate has no hard blocks or unresolved warnings."
      : "Candidate requires warning resolution before scheduling."
  ];

  if (slot.warningResult.unresolvedWarnings.length > 0) {
    explanation.push(
      `${slot.warningResult.unresolvedWarnings.length} warning(s) require review.`
    );
  }

  return explanation;
}

function assertOpenRequest(request: AppointmentUnscheduledRequest) {
  if (request.status !== "OPEN" && request.status !== "CANDIDATES_FOUND") {
    throw new Error("Only open unscheduled requests can be evaluated for candidates.");
  }
}

export function createUnscheduledAppointmentRequest(
  input: AppointmentUnscheduledRequestInput
): AppointmentUnscheduledRequest {
  assertPermission(input.permission);

  if (!APPOINTMENT_UNSCHEDULED_REQUEST_SOURCES.includes(input.source)) {
    throw new Error(`Unscheduled request source is invalid: "${input.source}".`);
  }

  const priority = input.priority ?? "NORMAL";

  if (!APPOINTMENT_UNSCHEDULED_REQUEST_PRIORITIES.includes(priority)) {
    throw new Error(`Unscheduled request priority is invalid: "${priority}".`);
  }

  const requestedContextFields = uniqueTrimmed(input.requestedContextFields);
  const requestedContext = new Set(requestedContextFields);
  const missingContextFields = input.template.requiredContextFields.filter(
    (field) => !requestedContext.has(field)
  );

  return {
    requestId: requiredText(input.requestId, "Unscheduled request ID"),
    organizationId: requiredText(input.organizationId, "Unscheduled request organization"),
    locationId: requiredText(input.locationId, "Unscheduled request location"),
    templateCode: input.template.code,
    templateVersion: input.template.version,
    source: input.source,
    status: "OPEN",
    priority,
    requestedByUserId: input.requestedByUserId?.trim() || null,
    ownerUserId: input.ownerUserId?.trim() || null,
    sourceTaskId: input.sourceTaskId?.trim() || null,
    requestedContextFields,
    missingContextFields,
    reasonCode: requiredText(input.reasonCode, "Unscheduled request reason code"),
    reasonNotes: requiredText(input.reasonNotes, "Unscheduled request reason notes"),
    createdAt: input.createdAt,
    isReadyForCandidateSearch: missingContextFields.length === 0,
    isSilentlyScheduled: false
  };
}

export function rankWaitlistCandidates(input: {
  request: AppointmentUnscheduledRequest;
  searchInput: AppointmentAvailabilitySearchInput;
  maximumCandidates?: number;
}): AppointmentWaitlistCandidateResult {
  assertOpenRequest(input.request);

  if (!input.request.isReadyForCandidateSearch) {
    throw new Error("Unscheduled request is missing required context for candidate search.");
  }

  const maximumCandidates = input.maximumCandidates ?? 5;

  if (!Number.isInteger(maximumCandidates) || maximumCandidates < 1) {
    throw new Error("Waitlist candidate maximum must be a positive integer.");
  }

  const searchResult = searchAppointmentAvailability({
    ...input.searchInput,
    includeWarningSlots: true,
    includeBlockedSlots: false,
    maximumResults: Math.max(maximumCandidates * 2, maximumCandidates)
  });
  const ranked = [...searchResult.slots]
    .filter((slot) => slot.status === "AVAILABLE" || slot.status === "WARNING")
    .map((slot) => ({
      slot,
      score: getPriorityScore(input.request.priority) + getSlotScore(slot)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.slot.startsAt.getTime() - right.slot.startsAt.getTime();
    })
    .slice(0, maximumCandidates)
    .map((entry, index) => ({
      requestId: input.request.requestId,
      candidateRank: index + 1,
      slot: entry.slot,
      score: entry.score,
      explanation: getCandidateExplanation(entry.slot)
    }));

  return {
    request: input.request,
    status: ranked.length > 0 ? "CANDIDATES_FOUND" : "OPEN",
    candidates: ranked,
    searchedCandidateCount: searchResult.searchedCandidateCount,
    noSilentScheduling: true
  };
}

export function prepareWaitlistPromotion(input: {
  request: AppointmentUnscheduledRequest;
  candidate: AppointmentWaitlistCandidate;
  mode: AppointmentWaitlistPromotionMode;
  permission: AppointmentWaitlistPermission;
  reasonCode: string;
  reasonNotes: string;
}): AppointmentWaitlistPromotionPlan {
  if (!APPOINTMENT_WAITLIST_PROMOTION_MODES.includes(input.mode)) {
    throw new Error(`Waitlist promotion mode is invalid: "${input.mode}".`);
  }

  if (input.candidate.requestId !== input.request.requestId) {
    throw new Error("Waitlist candidate does not belong to the unscheduled request.");
  }

  if (input.mode === "CREATE_DRAFT_FOR_REVIEW" && !input.permission.canCreateDraft) {
    throw new Error("Actor cannot create appointment drafts from waitlist requests.");
  }

  if (input.mode === "REQUEST_MANAGER_REVIEW" && !input.permission.canRequestManagerReview) {
    throw new Error("Actor cannot request manager review for waitlist promotion.");
  }

  return {
    requestId: input.request.requestId,
    mode: input.mode,
    status: "PROMOTION_READY",
    selectedCandidate: input.candidate,
    reasonCode: requiredText(input.reasonCode, "Waitlist promotion reason code"),
    reasonNotes: requiredText(input.reasonNotes, "Waitlist promotion reason notes"),
    createsScheduledAppointment: false,
    requiresExplicitCommit: true,
    nextCommandType:
      input.mode === "CREATE_DRAFT_FOR_REVIEW" ? "CREATE_DRAFT" : "MANAGER_REVIEW"
  };
}
