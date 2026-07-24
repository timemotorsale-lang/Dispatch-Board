import {
  getTimePolicyProfileTemplate,
  getTimePolicyVersion,
  resolveOvertimePolicyVersion,
  type OvertimeCoverage,
  type TimePolicyProfileTemplate,
  type TimePolicyVersion
} from "./policy-registry";

export type TimePolicyAssignmentCandidate = {
  id: string;
  staffUserId: string;
  locationId: string | null;
  profileTemplateId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  overtimeCoverage: OvertimeCoverage;
};

export type TimePolicyResolutionExceptionCode =
  | "POLICY_ASSIGNMENT_MISSING"
  | "POLICY_ASSIGNMENT_CONFLICT"
  | "POLICY_PROFILE_MISSING"
  | "POLICY_VERSION_MISSING"
  | "POLICY_VERSION_INACTIVE"
  | "OVERTIME_POLICY_UNRESOLVED";

export type TimePolicyResolutionException = {
  code: TimePolicyResolutionExceptionCode;
  blocking: true;
  message: string;
  sourceIds: string[];
};

export type ResolvedTimePolicyBundle = {
  assignmentId: string;
  profileTemplate: TimePolicyProfileTemplate;
  policyVersions: TimePolicyVersion[];
  overtimeCoverage: OvertimeCoverage;
  overtimePolicyVersionId: string;
  workInstant: string;
  locationId: string | null;
};

export type TimePolicyResolutionResult = {
  payrollReady: boolean;
  bundle: ResolvedTimePolicyBundle | null;
  exceptions: TimePolicyResolutionException[];
};

function parseInstant(value: string, label: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be an ISO timestamp.`);
  }

  return parsed;
}

function isEffective(input: {
  effectiveFrom: string;
  effectiveTo: string | null;
  instant: Date;
}) {
  const from = parseInstant(input.effectiveFrom, "Effective from");
  const to = input.effectiveTo ? parseInstant(input.effectiveTo, "Effective to") : null;
  return from <= input.instant && (!to || to > input.instant);
}

function exception(
  code: TimePolicyResolutionExceptionCode,
  message: string,
  sourceIds: string[] = []
): TimePolicyResolutionException {
  return { code, blocking: true, message, sourceIds };
}

export function resolveEffectiveTimePolicy(input: {
  assignments: TimePolicyAssignmentCandidate[];
  staffUserId: string;
  locationId?: string | null;
  workInstant: string;
}): TimePolicyResolutionResult {
  const instant = parseInstant(input.workInstant, "Work instant");
  const applicable = input.assignments.filter((assignment) => {
    if (assignment.staffUserId !== input.staffUserId) return false;
    if (input.locationId && assignment.locationId && assignment.locationId !== input.locationId) {
      return false;
    }
    return isEffective({
      effectiveFrom: assignment.effectiveFrom,
      effectiveTo: assignment.effectiveTo,
      instant
    });
  });

  if (applicable.length === 0) {
    return {
      payrollReady: false,
      bundle: null,
      exceptions: [
        exception(
          "POLICY_ASSIGNMENT_MISSING",
          "No active time policy assignment was found for the staff member and work instant."
        )
      ]
    };
  }

  if (applicable.length > 1) {
    return {
      payrollReady: false,
      bundle: null,
      exceptions: [
        exception(
          "POLICY_ASSIGNMENT_CONFLICT",
          "More than one active time policy assignment matched the staff member and work instant.",
          applicable.map((assignment) => assignment.id)
        )
      ]
    };
  }

  const assignment = applicable[0];
  const profileTemplate = getTimePolicyProfileTemplate(assignment.profileTemplateId);
  if (!profileTemplate) {
    return {
      payrollReady: false,
      bundle: null,
      exceptions: [
        exception(
          "POLICY_PROFILE_MISSING",
          "The assigned time policy profile template was not found.",
          [assignment.profileTemplateId]
        )
      ]
    };
  }

  const policyVersions: TimePolicyVersion[] = [];
  const exceptions: TimePolicyResolutionException[] = [];
  for (const policyVersionId of profileTemplate.policyVersionIds) {
    const version = getTimePolicyVersion(policyVersionId);
    if (!version) {
      exceptions.push(exception(
        "POLICY_VERSION_MISSING",
        "A referenced time policy version was not found.",
        [policyVersionId]
      ));
      continue;
    }
    if (!isEffective({
      effectiveFrom: version.effectiveFrom,
      effectiveTo: version.effectiveTo,
      instant
    })) {
      exceptions.push(exception(
        "POLICY_VERSION_INACTIVE",
        "A referenced time policy version is not effective for the work instant.",
        [policyVersionId]
      ));
      continue;
    }
    policyVersions.push(version);
  }

  const overtimePolicy = resolveOvertimePolicyVersion(assignment.overtimeCoverage);
  if (!overtimePolicy) {
    exceptions.push(exception(
      "OVERTIME_POLICY_UNRESOLVED",
      "The staff member does not have a resolved non-exempt overtime policy.",
      [assignment.overtimeCoverage]
    ));
  } else if (!policyVersions.some((version) => version.id === overtimePolicy.id)) {
    policyVersions.push(overtimePolicy);
  }

  if (exceptions.length > 0 || !overtimePolicy) {
    return { payrollReady: false, bundle: null, exceptions };
  }

  return {
    payrollReady: true,
    bundle: {
      assignmentId: assignment.id,
      profileTemplate,
      policyVersions,
      overtimeCoverage: assignment.overtimeCoverage,
      overtimePolicyVersionId: overtimePolicy.id,
      workInstant: input.workInstant,
      locationId: assignment.locationId
    },
    exceptions: []
  };
}
