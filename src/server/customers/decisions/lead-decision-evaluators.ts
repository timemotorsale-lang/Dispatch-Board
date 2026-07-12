import type {
  CrmDecisionEvaluationRequest,
  CrmDecisionEvaluator,
  CrmDecisionResult
} from "./crm-decision-domain";

export const LEAD_PRIORITY_DECISION_TYPE = "LEAD_PRIORITY";
export const LEAD_PRIORITY_VERSION = "lead-priority/1.0.0";
export const LEAD_ASSIGNMENT_DECISION_TYPE = "LEAD_ASSIGNMENT";
export const LEAD_ASSIGNMENT_VERSION = "lead-assignment/1.0.0";

type LeadPriorityFacts = {
  evaluatedAt: string;
  purchaseTimeframeDays?: number | null;
  engagementLevel?: "NONE" | "ONE_WAY" | "TWO_WAY";
  appointmentIntent?: boolean;
  vehicleFit?: "AVAILABLE" | "CLOSE_MATCH" | "UNAVAILABLE" | "UNKNOWN";
  financingOrTradeReadiness?: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  reachableContactCount?: number;
  priorPositiveRelationship?: boolean;
  doNotContact?: boolean;
  duplicateOrSpam?: boolean;
  exhaustedAttemptSequence?: boolean;
};

type AssignmentCandidate = {
  userId: string;
  eligible: boolean;
  availability: number;
  openHotLeadCount: number;
  capacityLimit: number;
  continuity: number;
  skillFit: number;
  rotation: number;
  lastAssignedAt?: string | null;
  ineligibilityReasons?: string[];
};

function facts<T>(request: CrmDecisionEvaluationRequest) {
  return request.facts as T;
}

function clamp(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum, Math.round(value)));
}

function priorityDueAt(priority: "P1" | "P2" | "P3" | null, evaluatedAt: string) {
  const date = new Date(evaluatedAt);
  const minutes = priority === "P1" ? 10 : priority === "P2" ? 60 : 8 * 60;
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

export const leadPriorityEvaluator: CrmDecisionEvaluator = {
  decisionType: LEAD_PRIORITY_DECISION_TYPE,
  algorithmVersion: LEAD_PRIORITY_VERSION,
  evaluate(request): CrmDecisionResult {
    const input = facts<LeadPriorityFacts>(request);
    if (input.doNotContact) {
      return {
        decisionType: request.decisionType, algorithmVersion: request.algorithmVersion,
        subject: request.subject, customerId: request.customerId ?? null, score: 0, priority: null,
        recommendedOwnerId: null, recommendedActionCode: "REVIEW_CONTACT_RESTRICTION", dueAt: null,
        reasonCodes: ["DO_NOT_CONTACT_RESTRICTION"],
        explanation: "The requested outbound contact is restricted and requires policy review.",
        confidence: "HIGH", missingInputs: [], managerReviewRequired: true
      };
    }

    let score = 0;
    const reasons: string[] = [];
    const missing: string[] = [];
    if (input.purchaseTimeframeDays === undefined || input.purchaseTimeframeDays === null) {
      missing.push("purchaseTimeframeDays");
    } else if (input.purchaseTimeframeDays <= 7) { score += 25; reasons.push("BUYING_WITHIN_7_DAYS"); }
    else if (input.purchaseTimeframeDays <= 30) { score += 18; reasons.push("BUYING_WITHIN_30_DAYS"); }
    else if (input.purchaseTimeframeDays <= 90) { score += 10; reasons.push("BUYING_WITHIN_90_DAYS"); }

    if (input.engagementLevel === undefined) missing.push("engagementLevel");
    else if (input.engagementLevel === "TWO_WAY") { score += 20; reasons.push("RECENT_TWO_WAY_ENGAGEMENT"); }
    else if (input.engagementLevel === "ONE_WAY") { score += 8; reasons.push("RECENT_ONE_WAY_ENGAGEMENT"); }
    if (input.appointmentIntent) { score += 15; reasons.push("APPOINTMENT_INTENT"); }
    if (input.vehicleFit === "AVAILABLE") { score += 15; reasons.push("VEHICLE_AVAILABLE"); }
    else if (input.vehicleFit === "CLOSE_MATCH") { score += 10; reasons.push("CLOSE_VEHICLE_MATCH"); }
    else if (input.vehicleFit === "UNAVAILABLE") { score -= 10; reasons.push("NO_AVAILABLE_VEHICLE_MATCH"); }
    if (input.financingOrTradeReadiness === "COMPLETE") { score += 10; reasons.push("READINESS_INFORMATION_COMPLETE"); }
    else if (input.financingOrTradeReadiness === "PARTIAL") score += 5;
    const contacts = input.reachableContactCount ?? 0;
    score += contacts >= 2 ? 10 : contacts === 1 ? 5 : -25;
    if (contacts > 0) reasons.push("REACHABLE_CONTACT_AVAILABLE"); else reasons.push("NO_REACHABLE_CONTACT");
    if (input.priorPositiveRelationship) { score += 5; reasons.push("PRIOR_POSITIVE_RELATIONSHIP"); }
    if (input.exhaustedAttemptSequence) { score -= 10; reasons.push("ATTEMPT_SEQUENCE_EXHAUSTED"); }
    if (input.duplicateOrSpam) { score -= 40; reasons.push("DUPLICATE_OR_SPAM_EVIDENCE"); }

    score = clamp(score, 100);
    const priority = score >= 80 ? "P1" : score >= 60 ? "P2" : score >= 35 ? "P3" : null;
    const confidence = missing.length ? "LOW" : "HIGH";
    const action = contacts === 0 ? "GATHER_REACHABLE_CONTACT" : priority === "P1" ? "CALL_AND_CONFIRM_NEXT_STEP" : priority ? "FOLLOW_UP_LEAD" : "PLACE_IN_NURTURE";
    return {
      decisionType: request.decisionType, algorithmVersion: request.algorithmVersion,
      subject: request.subject, customerId: request.customerId ?? null, score, priority,
      recommendedOwnerId: null, recommendedActionCode: action,
      dueAt: priorityDueAt(priority, input.evaluatedAt), reasonCodes: reasons,
      explanation: `Lead scored ${score} based on ${reasons.length ? reasons.join(", ").toLowerCase().replaceAll("_", " ") : "limited qualification evidence"}.`,
      confidence, missingInputs: missing, managerReviewRequired: Boolean(input.duplicateOrSpam)
    };
  }
};

export const leadAssignmentEvaluator: CrmDecisionEvaluator = {
  decisionType: LEAD_ASSIGNMENT_DECISION_TYPE,
  algorithmVersion: LEAD_ASSIGNMENT_VERSION,
  evaluate(request): CrmDecisionResult {
    const input = facts<{ candidates?: AssignmentCandidate[] }>(request);
    const eligible = (input.candidates ?? []).filter(
      (candidate) => candidate.eligible && candidate.openHotLeadCount < candidate.capacityLimit
    );
    if (!eligible.length) {
      return {
        decisionType: request.decisionType, algorithmVersion: request.algorithmVersion,
        subject: request.subject, customerId: request.customerId ?? null, score: null, priority: null,
        recommendedOwnerId: null, recommendedActionCode: "MANAGER_ASSIGN_LEAD", dueAt: null,
        reasonCodes: ["NO_ELIGIBLE_OWNER"], explanation: "No eligible owner has available lead capacity.",
        confidence: "HIGH", missingInputs: [], managerReviewRequired: true
      };
    }
    const ranked = eligible.map((candidate) => ({
      candidate,
      score: clamp(candidate.availability, 30) + clamp(25 * (1 - candidate.openHotLeadCount / Math.max(1, candidate.capacityLimit)), 25) + clamp(candidate.continuity, 20) + clamp(candidate.skillFit, 15) + clamp(candidate.rotation, 10)
    })).sort((left, right) =>
      right.score - left.score || right.candidate.continuity - left.candidate.continuity || left.candidate.openHotLeadCount - right.candidate.openHotLeadCount || (left.candidate.lastAssignedAt ?? "").localeCompare(right.candidate.lastAssignedAt ?? "") || left.candidate.userId.localeCompare(right.candidate.userId)
    );
    const selected = ranked[0];
    return {
      decisionType: request.decisionType, algorithmVersion: request.algorithmVersion,
      subject: request.subject, customerId: request.customerId ?? null, score: selected.score,
      priority: null, recommendedOwnerId: selected.candidate.userId,
      recommendedActionCode: "ASSIGN_LEAD", dueAt: null,
      reasonCodes: ["ELIGIBLE_OWNER", "CAPACITY_AVAILABLE", ...(selected.candidate.continuity > 0 ? ["RELATIONSHIP_CONTINUITY"] : [])],
      explanation: `Selected the highest-ranked eligible owner with assignment score ${selected.score}.`,
      confidence: "HIGH", missingInputs: [], managerReviewRequired: false
    };
  }
};
