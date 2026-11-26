BEGIN;

ALTER TABLE "RepairOrder"
  DROP CONSTRAINT "RepairOrder_state_reason_check",
  ADD CONSTRAINT "RepairOrder_state_reason_check" CHECK (
    ("operatingState" = 'ACTIVE' AND "stateReason" IS NULL)
    OR ("operatingState" IN ('WAITING', 'BLOCKED', 'CLOSED') AND "stateReason" ~ '[^[:space:]]')
  );

ALTER TABLE "PartStockLedgerEntry"
  DROP CONSTRAINT "PartStockLedgerEntry_value_check",
  ADD CONSTRAINT "PartStockLedgerEntry_value_check" CHECK (
    ("quantityDelta" <> 0 OR "allocatedDelta" <> 0) AND "unitCostCents" >= 0 AND "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "RepairJobDispatch"
  DROP CONSTRAINT "RepairJobDispatch_override_check",
  ADD CONSTRAINT "RepairJobDispatch_override_check" CHECK (
    "overrideReason" IS NULL OR "overrideReason" ~ '[^[:space:]]'
  );

ALTER TABLE "RepairJobLaborEvent"
  DROP CONSTRAINT "RepairJobLaborEvent_reason_check",
  ADD CONSTRAINT "RepairJobLaborEvent_reason_check" CHECK (
    "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "RepairQualityInspection"
  DROP CONSTRAINT "RepairQualityInspection_disposition_check",
  ADD CONSTRAINT "RepairQualityInspection_disposition_check" CHECK (
    ("disposition" = 'PASSED' AND "safetyChecksPassed"
      AND (NOT "peerVerificationRequired" OR "peerVerificationPassed")
      AND (NOT "roadTestRequired" OR "roadTestOutcome" = 'PASSED')
      AND jsonb_array_length("failureReasonCodes") = 0
      AND "reworkInstructions" IS NULL)
    OR
    ("disposition" = 'FAILED'
      AND jsonb_array_length("failureReasonCodes") > 0
      AND "reworkInstructions" ~ '[^[:space:]]')
  );

ALTER TABLE "RepairOrderReleaseAuthorization"
  DROP CONSTRAINT "RepairOrderReleaseAuthorization_gate_check",
  ADD CONSTRAINT "RepairOrderReleaseAuthorization_gate_check" CHECK (
    "keysVerified" = TRUE
    AND jsonb_typeof("qcInspectionIds") = 'array'
    AND jsonb_typeof("vendorReturnReviewIds") = 'array'
    AND (jsonb_array_length("qcInspectionIds") > 0 OR jsonb_array_length("vendorReturnReviewIds") > 0)
    AND jsonb_typeof("releaseEvidence") = 'array'
    AND jsonb_array_length("releaseEvidence") > 0
    AND jsonb_typeof("openExceptions") = 'array'
    AND jsonb_array_length("openExceptions") = 0
    AND "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "RepairAdvisorUpdate"
  DROP CONSTRAINT "RepairAdvisorUpdate_values_check",
  ADD CONSTRAINT "RepairAdvisorUpdate_values_check" CHECK (
    "version" > 0
    AND length(trim("statusCode")) > 0
    AND length(trim("contactOutcome")) > 0
    AND length(trim("customerVisibleSummary")) > 0
    AND "reason" ~ '[^[:space:]]'
    AND jsonb_typeof("exceptionCodes") = 'array'
  );

ALTER TABLE "RepairDeliveryReadinessEvaluation"
  DROP CONSTRAINT "RepairDeliveryReadiness_values_check",
  ADD CONSTRAINT "RepairDeliveryReadiness_values_check" CHECK (
    "version" > 0
    AND jsonb_typeof("checks") = 'array'
    AND jsonb_array_length("checks") > 0
    AND jsonb_typeof("blockerCodes") = 'array'
    AND "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "RepairComebackCase"
  DROP CONSTRAINT "RepairComebackCase_values_check",
  ADD CONSTRAINT "RepairComebackCase_values_check" CHECK (
    "version" > 0
    AND "estimatedCostCents" >= 0
    AND ("actualCostCents" IS NULL
    OR "actualCostCents" >= 0)
    AND "disciplinaryUseProhibited"
    AND "reportedConcern" ~ '[^[:space:]]'
  );

ALTER TABLE "RepairComebackCase"
  DROP CONSTRAINT "RepairComebackCase_resolution_check",
  ADD CONSTRAINT "RepairComebackCase_resolution_check" CHECK (
    ("status" IN ('OPEN', 'REVIEWING')
    AND "resolvedAt" IS NULL
    AND "resolvedByUserId" IS NULL)
    OR ("status" IN ('RESOLVED', 'CLOSED')
    AND "resolvedAt" IS NOT NULL
    AND "resolvedByUserId" IS NOT NULL
    AND "actualCostCents" IS NOT NULL
    AND "resolutionOutcome" ~ '[^[:space:]]')
  );

ALTER TABLE "RepairComebackEvent"
  DROP CONSTRAINT "RepairComebackEvent_values_check",
  ADD CONSTRAINT "RepairComebackEvent_values_check" CHECK (
    "version" > 0 AND ("actualCostCents" IS NULL OR "actualCostCents" >= 0) AND "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "TechnicianPresenceRecord"
  DROP CONSTRAINT "TechnicianPresenceRecord_values_check",
  ADD CONSTRAINT "TechnicianPresenceRecord_values_check" CHECK (
    "endsAt" > "startsAt"
    AND "approvedNonProductiveMinutes" >= 0
    AND "approvedNonProductiveMinutes"<=round(extract(epoch from ("endsAt"-"startsAt"))/60)
    AND length(trim("sourceCode")) > 0
    AND "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "VehicleEvidenceEvent"
  DROP CONSTRAINT "VehicleEvidenceEvent_reason_check",
  ADD CONSTRAINT "VehicleEvidenceEvent_reason_check" CHECK (
    "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "WorkKnowledgeLink"
  DROP CONSTRAINT "WorkKnowledgeLink_reason_check",
  ADD CONSTRAINT "WorkKnowledgeLink_reason_check" CHECK (
    "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "WorkKnowledgeEvent"
  DROP CONSTRAINT "WorkKnowledgeEvent_reason_check",
  ADD CONSTRAINT "WorkKnowledgeEvent_reason_check" CHECK (
    "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "VehicleControlledOutput"
  DROP CONSTRAINT "VehicleControlledOutput_reason_check",
  ADD CONSTRAINT "VehicleControlledOutput_reason_check" CHECK (
    "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "VehicleControlledOutputEvent"
  DROP CONSTRAINT "VehicleControlledOutputEvent_reason_check",
  ADD CONSTRAINT "VehicleControlledOutputEvent_reason_check" CHECK (
    "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "DiagnosticRuleSetVersion"
  DROP CONSTRAINT "DiagnosticRuleSet_identity_check",
  ADD CONSTRAINT "DiagnosticRuleSet_identity_check" CHECK (
    BTRIM("ruleSetKey") <> '' AND "purpose" ~ '[^[:space:]]' AND "version" > 0
  );

ALTER TABLE "DiagnosticConclusionVersion"
  DROP CONSTRAINT "DiagnosticConclusion_cause_check",
  ADD CONSTRAINT "DiagnosticConclusion_cause_check" CHECK (
    ("status" IN ('PROPOSED', 'CONFIRMED')
    AND "hypothesisId" IS NOT NULL
    AND "causeStatement" ~ '[^[:space:]]')
    OR ("status" IN ('REJECTED', 'ABSTAINED', 'ESCALATED'))
  );

ALTER TABLE "DiagnosticRepairHandoffVersion"
  DROP CONSTRAINT "DiagnosticRepairHandoff_identity_check",
  ADD CONSTRAINT "DiagnosticRepairHandoff_identity_check" CHECK (
    "version" > 0
    AND BTRIM("policyVersion") <> ''
    AND "recommendation" ~ '[^[:space:]]'
    AND "proposedCorrection" ~ '[^[:space:]]'
  );

ALTER TABLE "DiagnosticVerificationVersion"
  DROP CONSTRAINT "DiagnosticVerification_identity_check",
  ADD CONSTRAINT "DiagnosticVerification_identity_check" CHECK (
    "version" > 0
    AND BTRIM("policyVersion") <> ''
    AND LENGTH(BTRIM("originalConcern")) >= 1
    AND "repairSummary" ~ '[^[:space:]]'
  );

ALTER TABLE "DiagnosticEstimateDraftVersion"
  DROP CONSTRAINT "DiagnosticEstimateDraft_identity_check",
  ADD CONSTRAINT "DiagnosticEstimateDraft_identity_check" CHECK (
    "version" > 0
    AND BTRIM("policyVersion") <> ''
    AND "advisorSummary" ~ '[^[:space:]]'
    AND "customerCauseSummary" ~ '[^[:space:]]'
    AND "customerCorrectionSummary" ~ '[^[:space:]]'
  );

ALTER TABLE "TimeAttendancePolicyAssignment"
  DROP CONSTRAINT "TimeAttendancePolicyAssignment_reason_check",
  ADD CONSTRAINT "TimeAttendancePolicyAssignment_reason_check" CHECK (
    "approvalReason" ~ '[^[:space:]]'
  );

ALTER TABLE "TimeAttendanceEvent"
  DROP CONSTRAINT "TimeAttendanceEvent_reason_check",
  ADD CONSTRAINT "TimeAttendanceEvent_reason_check" CHECK (
    "reason" IS NULL OR "reason" ~ '[^[:space:]]'
  );

ALTER TABLE "TimeCardApproval"
  DROP CONSTRAINT "TimeCardApproval_required_text_check",
  ADD CONSTRAINT "TimeCardApproval_required_text_check" CHECK (
    BTRIM("decision") <> ''
    AND "reason" ~ '[^[:space:]]'
    AND BTRIM("cardChecksum") <> ''
    AND "timeCardVersion" >= 0
  );

COMMIT;
