import type { GenerationInputTemplate, GenerationInputUser } from "@/server/services/generation-inputs";

export type AssignmentRecommendationReasonCode =
  | "DIRECT_DUTY_MATCH"
  | "ROLE_MATCH"
  | "TEMPLATE_OWNER_MATCH"
  | "WORKFLOW_AREA_MATCH"
  | "MANAGER_REVIEW_NEEDED";

export type AssignmentRecommendationResult = {
  recommendedUserId: string | null;
  reasonCode: AssignmentRecommendationReasonCode;
  reasonPath: string[];
  explanation: string;
  managerReviewNeeded: boolean;
};

export type RecommendAssignmentInput = {
  users: GenerationInputUser[];
  template: GenerationInputTemplate;
  templateOwnerUserId?: string | null;
};

type RecommendationCandidate = {
  userId: string;
  userName: string;
  userEmail: string;
};

function compareText(left: string, right: string) {
  return left.localeCompare(right);
}

function sortCandidates(candidates: RecommendationCandidate[]) {
  return [...candidates].sort(
    (left, right) =>
      compareText(left.userName, right.userName) ||
      compareText(left.userEmail, right.userEmail) ||
      compareText(left.userId, right.userId)
  );
}

function toCandidate(user: GenerationInputUser): RecommendationCandidate {
  return {
    userId: user.userId,
    userName: user.userName,
    userEmail: user.userEmail
  };
}

function chooseCandidate(candidates: RecommendationCandidate[]) {
  return sortCandidates(candidates)[0] ?? null;
}

function buildMatchedResult(
  candidate: RecommendationCandidate,
  reasonCode: Exclude<AssignmentRecommendationReasonCode, "MANAGER_REVIEW_NEEDED">,
  reasonPath: string[],
  explanation: string
): AssignmentRecommendationResult {
  return {
    recommendedUserId: candidate.userId,
    reasonCode,
    reasonPath,
    explanation,
    managerReviewNeeded: false
  };
}

function hasDirectDutyMatch(user: GenerationInputUser, template: GenerationInputTemplate) {
  return Boolean(template.dutyId && user.directDuties.some((duty) => duty.dutyId === template.dutyId));
}

function hasRoleMatch(user: GenerationInputUser, template: GenerationInputTemplate) {
  return Boolean(template.roleId && user.roles.some((role) => role.roleId === template.roleId));
}

function hasWorkflowAreaMatch(user: GenerationInputUser, template: GenerationInputTemplate) {
  return user.resolvedDuties.some((duty) => duty.workflowArea === template.workflowArea);
}

export function recommendAssignment(input: RecommendAssignmentInput): AssignmentRecommendationResult {
  const users = sortCandidates(input.users.map(toCandidate));
  const directDutyMatches = input.users.filter((user) => hasDirectDutyMatch(user, input.template)).map(toCandidate);
  const directDutyMatch = chooseCandidate(directDutyMatches);

  if (directDutyMatch) {
    return buildMatchedResult(
      directDutyMatch,
      "DIRECT_DUTY_MATCH",
      [`Checked direct duty ${input.template.dutyName ?? input.template.dutyId}.`, `Selected ${directDutyMatch.userName}.`],
      `${directDutyMatch.userName} is recommended because they have the direct duty for this template.`
    );
  }

  const roleMatches = input.users.filter((user) => hasRoleMatch(user, input.template)).map(toCandidate);
  const roleMatch = chooseCandidate(roleMatches);

  if (roleMatch) {
    return buildMatchedResult(
      roleMatch,
      "ROLE_MATCH",
      [
        "No direct user duty match was found.",
        `Checked role ${input.template.roleName ?? input.template.roleId}.`,
        `Selected ${roleMatch.userName}.`
      ],
      `${roleMatch.userName} is recommended because their role matches this template.`
    );
  }

  const templateOwner = users.find((user) => user.userId === input.templateOwnerUserId) ?? null;

  if (templateOwner) {
    return buildMatchedResult(
      templateOwner,
      "TEMPLATE_OWNER_MATCH",
      [
        "No direct user duty match was found.",
        "No role match was found.",
        `Selected template owner ${templateOwner.userName}.`
      ],
      `${templateOwner.userName} is recommended because they own this generated template task.`
    );
  }

  const workflowAreaMatches = input.users
    .filter((user) => hasWorkflowAreaMatch(user, input.template))
    .map(toCandidate);
  const workflowAreaMatch = chooseCandidate(workflowAreaMatches);

  if (workflowAreaMatch) {
    return buildMatchedResult(
      workflowAreaMatch,
      "WORKFLOW_AREA_MATCH",
      [
        "No direct user duty match was found.",
        "No role match was found.",
        "No template owner match was found.",
        `Checked workflow area ${input.template.workflowArea}.`,
        `Selected ${workflowAreaMatch.userName}.`
      ],
      `${workflowAreaMatch.userName} is recommended because their duties match the workflow area.`
    );
  }

  return {
    recommendedUserId: null,
    reasonCode: "MANAGER_REVIEW_NEEDED",
    reasonPath: [
      "No direct user duty match was found.",
      "No role match was found.",
      "No template owner match was found.",
      "No workflow-area match was found."
    ],
    explanation: "No clear staff match was found, so a manager should review this assignment.",
    managerReviewNeeded: true
  };
}
