export const recommendationReasonCodes = [
  "DIRECT_DUTY_MATCH",
  "ROLE_MATCH",
  "TEMPLATE_OWNER_MATCH",
  "WORKFLOW_AREA_MATCH",
  "MANAGER_REVIEW_NEEDED"
] as const;

export type RecommendationReasonCode = (typeof recommendationReasonCodes)[number];

export type RecommendationCandidate = {
  userId: string;
  userName: string;
  isActive: boolean;
  roleIds: string[];
  directDutyIds: string[];
  workflowAreas: string[];
};

export type RecommendationContext = {
  dutyId?: string | null;
  roleId?: string | null;
  templateOwnerUserId?: string | null;
  workflowArea?: string | null;
  candidates: RecommendationCandidate[];
};

export type RecommendationResult = {
  recommendedUserId: string | null;
  reasonCode: RecommendationReasonCode;
  reasonPath: string[];
  reasonText: string;
  reviewNeeded: boolean;
};

function normalize(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function uniqueNormalized(values: string[]) {
  return new Set(values.map(normalize).filter(Boolean));
}

function eligibleCandidates(candidates: RecommendationCandidate[]) {
  return candidates
    .filter((candidate) => candidate.isActive && normalize(candidate.userId))
    .map((candidate) => ({
      ...candidate,
      userId: normalize(candidate.userId),
      userName: normalize(candidate.userName),
      roleIds: uniqueNormalized(candidate.roleIds),
      directDutyIds: uniqueNormalized(candidate.directDutyIds),
      workflowAreas: uniqueNormalized(candidate.workflowAreas)
    }))
    .sort(
      (left, right) =>
        left.userName.localeCompare(right.userName) || left.userId.localeCompare(right.userId)
    );
}

export function recommendAssignment(context: RecommendationContext): RecommendationResult {
  const candidates = eligibleCandidates(context.candidates);
  const dutyId = normalize(context.dutyId);
  const roleId = normalize(context.roleId);
  const ownerId = normalize(context.templateOwnerUserId);
  const workflowArea = normalize(context.workflowArea);
  const reasonPath: string[] = [];

  const rules: Array<{
    code: Exclude<RecommendationReasonCode, "MANAGER_REVIEW_NEEDED">;
    label: string;
    matches: (candidate: (typeof candidates)[number]) => boolean;
  }> = [
    {
      code: "DIRECT_DUTY_MATCH",
      label: "Checked direct user duty match",
      matches: (candidate) => Boolean(dutyId) && candidate.directDutyIds.has(dutyId)
    },
    {
      code: "ROLE_MATCH",
      label: "Checked role match",
      matches: (candidate) => Boolean(roleId) && candidate.roleIds.has(roleId)
    },
    {
      code: "TEMPLATE_OWNER_MATCH",
      label: "Checked task template owner",
      matches: (candidate) => Boolean(ownerId) && candidate.userId === ownerId
    },
    {
      code: "WORKFLOW_AREA_MATCH",
      label: "Checked workflow-area match",
      matches: (candidate) => Boolean(workflowArea) && candidate.workflowAreas.has(workflowArea)
    }
  ];

  for (const rule of rules) {
    reasonPath.push(rule.label);
    const match = candidates.find(rule.matches);

    if (match) {
      return {
        recommendedUserId: match.userId,
        reasonCode: rule.code,
        reasonPath,
        reasonText: {
          DIRECT_DUTY_MATCH: "Recommended because this user has a direct duty match.",
          ROLE_MATCH: "Recommended because this user's role matches the task template.",
          TEMPLATE_OWNER_MATCH: "Recommended because this user owns the task template.",
          WORKFLOW_AREA_MATCH: "Recommended because this user's duties match the workflow area."
        }[rule.code],
        reviewNeeded: false
      };
    }
  }

  reasonPath.push("No eligible candidate matched; manager review is needed");
  return {
    recommendedUserId: null,
    reasonCode: "MANAGER_REVIEW_NEEDED",
    reasonPath,
    reasonText: "Manager review needed because no eligible staff match was found.",
    reviewNeeded: true
  };
}
