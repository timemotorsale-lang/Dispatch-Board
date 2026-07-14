import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(testsDir, "../../..");
const schemaPath = path.join(workspaceRoot, "prisma", "schema.prisma");
const migrationsPath = path.join(workspaceRoot, "prisma", "migrations");

function getModelBlock(schema: string, modelName: string) {
  const modelMatch = schema.match(new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`, "m"));

  expect(modelMatch, `Expected to find model ${modelName} in schema.prisma.`).not.toBeNull();

  return modelMatch?.[1] ?? "";
}

describe("prisma schema constraints", () => {
  it("declares the VEH-M1 enterprise command, tenancy, rollout, and health foundation", async () => {
    const schema = await readFile(schemaPath, "utf8");
    for (const model of ["EnterpriseAggregateVersion", "EnterpriseCommandLedger", "EnterpriseDomainEvent", "EnterpriseAuditEvent", "EnterpriseOutboxMessage", "VehicleCapabilityGrant", "VehicleOperationsFeatureFlag", "EnterpriseProjectionCheckpoint"]) expect(schema).toContain(`model ${model} {`);
    expect(getModelBlock(schema, "EnterpriseCommandLedger")).toMatch(/@@unique\(\[organizationId,\s*domain,\s*commandType,\s*idempotencyKey\]\)/);
    expect(getModelBlock(schema, "EnterpriseAggregateVersion")).toMatch(/version\s+Int\s+@default\(0\)/);
    expect(getModelBlock(schema, "EnterpriseOutboxMessage")).toMatch(/status\s+EnterpriseOutboxStatus\s+@default\(PENDING\)/);
    const migrationEntries = await readdir(migrationsPath, { withFileTypes: true });
    const sql = (await Promise.all(migrationEntries.filter((entry) => entry.isDirectory()).map((entry) => readFile(path.join(migrationsPath, entry.name, "migration.sql"), "utf8")))).join("\n");
    expect(sql).toMatch(/EnterpriseCommandLedger_required_text_check/);
    expect(sql).toMatch(/EnterpriseAggregateVersion_location_tenant_fkey/);
    expect(sql).toMatch(/EnterpriseOutboxMessage_attempt_check/);
    expect(sql).toMatch(/VehicleCapabilityGrant_org_global_user_capability_key/);
    expect(sql).toMatch(/VehicleOperationsFeatureFlag_org_global_code_key/);
    expect(sql).toMatch(/EnterpriseProjectionCheckpoint_org_global_projectionCode_key/);
  });
  it("declares the DB-021 unique constraints and indexes in Prisma-native schema", async () => {
    const schema = await readFile(schemaPath, "utf8");
    const taskTemplateModel = getModelBlock(schema, "TaskTemplate");
    const boardDayModel = getModelBlock(schema, "BoardDay");
    const taskModel = getModelBlock(schema, "Task");
    const taskCommentModel = getModelBlock(schema, "TaskComment");
    const generationRunModel = getModelBlock(schema, "GenerationRun");

    expect(taskTemplateModel).toMatch(/templateCategory\s+String\?/);
    expect(taskTemplateModel).toMatch(/priority\s+TaskTemplatePriority\s+@default\(MEDIUM\)/);
    expect(taskTemplateModel).toMatch(/requiredUpdateFields\s+Json/);
    expect(taskTemplateModel).toMatch(/checklistItems\s+Json/);
    expect(taskTemplateModel).toMatch(/completionCriteria\s+Json/);
    expect(taskTemplateModel).toMatch(/defaultStatusRules\s+Json/);
    expect(taskTemplateModel).toMatch(/approvalRules\s+Json/);
    expect(taskTemplateModel).toMatch(/intelligenceSignalType\s+String/);
    expect(taskTemplateModel).toMatch(/taskCardDisplayHints\s+Json/);

    expect(boardDayModel).toMatch(/date\s+DateTime\s+@unique\s+@db\.Date/);

    expect(taskModel).toMatch(/assignedUserId\s+String\b/);
    expect(taskModel).toMatch(/recommendationReasonCode\s+String\?/);
    expect(taskModel).toMatch(/recommendationExplanation\s+String\?/);
    expect(taskModel).toMatch(/dueAt\s+DateTime\b/);
    expect(taskModel).toMatch(/templateSnapshot\s+Json\?/);
    expect(taskModel).toMatch(/updateFieldValues\s+Json\?/);
    expect(taskModel).toMatch(/@@unique\(\[boardDayId,\s*sourceTemplateId,\s*assignedUserId\]\)/);
    expect(taskModel).toMatch(/@@index\(\[boardDayId,\s*status\]\)/);
    expect(taskModel).toMatch(/@@index\(\[boardDayId,\s*assignedUserId\]\)/);
    expect(taskModel).toMatch(/@@index\(\[boardDayId,\s*workflowArea\]\)/);

    expect(taskCommentModel).toMatch(/taskId\s+String\b/);
    expect(taskCommentModel).toMatch(/authorUserId\s+String\b/);
    expect(taskCommentModel).toMatch(/body\s+String\b/);
    expect(taskCommentModel).toMatch(/@@index\(\[taskId\]\)/);
    expect(taskCommentModel).toMatch(/@@index\(\[taskId,\s*createdAt\]\)/);

    expect(generationRunModel).toMatch(/@@index\(\[boardDate,\s*startedAt\]\)/);
  });

  it("keeps the blocked-task blocker reason rule in a SQL migration", async () => {
    const migrationEntries = await readdir(migrationsPath, { withFileTypes: true });
    const migrationSqlContents = await Promise.all(
      migrationEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readFile(path.join(migrationsPath, entry.name, "migration.sql"), "utf8"))
    );
    const combinedSql = migrationSqlContents.join("\n");

    expect(combinedSql).toMatch(/ADD CONSTRAINT "Task_blocked_requires_blocker_reason_check"/);
    expect(combinedSql).toMatch(/NULLIF\(BTRIM\("blockerReason"\), ''\) IS NOT NULL/);
  });

  it("declares the EAPT-003 organization and location foundation", async () => {
    const schema = await readFile(schemaPath, "utf8");
    const organizationModel = getModelBlock(schema, "Organization");
    const locationModel = getModelBlock(schema, "Location");
    const operatingWindowModel = getModelBlock(schema, "LocationOperatingWindow");
    const closureModel = getModelBlock(schema, "LocationClosure");

    expect(organizationModel).toMatch(/code\s+String\s+@unique/);
    expect(organizationModel).toMatch(/locations\s+Location\[\]/);

    expect(locationModel).toMatch(/organizationId\s+String\b/);
    expect(locationModel).toMatch(/timezone\s+String\b/);
    expect(locationModel).toMatch(/phoneNumber\s+String\?/);
    expect(locationModel).toMatch(
      /schedulingStatus\s+LocationSchedulingStatus\s+@default\(DRAFT\)/
    );
    expect(locationModel).toMatch(/@@unique\(\[organizationId,\s*code\]\)/);
    expect(locationModel).toMatch(/@@index\(\[organizationId,\s*schedulingStatus\]\)/);

    expect(operatingWindowModel).toMatch(/businessDay\s+BusinessDay\b/);
    expect(operatingWindowModel).toMatch(/opensAtMinute\s+Int\b/);
    expect(operatingWindowModel).toMatch(/closesAtMinute\s+Int\b/);
    expect(operatingWindowModel).toMatch(/validFrom\s+DateTime\s+@db\.Date/);
    expect(operatingWindowModel).toMatch(/validTo\s+DateTime\?\s+@db\.Date/);

    expect(closureModel).toMatch(/type\s+LocationClosureType\b/);
    expect(closureModel).toMatch(/startsAt\s+DateTime\b/);
    expect(closureModel).toMatch(/endsAt\s+DateTime\b/);
    expect(closureModel).toMatch(/reason\s+String\b/);
    expect(closureModel).toMatch(/createdByUserId\s+String\?/);
  });

  it("protects EAPT-003 time, closure, timezone, and country invariants in SQL", async () => {
    const migrationEntries = await readdir(migrationsPath, { withFileTypes: true });
    const migrationSqlContents = await Promise.all(
      migrationEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readFile(path.join(migrationsPath, entry.name, "migration.sql"), "utf8"))
    );
    const combinedSql = migrationSqlContents.join("\n");

    expect(combinedSql).toMatch(/LocationOperatingWindow_minute_range_check/);
    expect(combinedSql).toMatch(/"opensAtMinute" < "closesAtMinute"/);
    expect(combinedSql).toMatch(/LocationOperatingWindow_validity_check/);
    expect(combinedSql).toMatch(/LocationClosure_time_range_check/);
    expect(combinedSql).toMatch(/LocationClosure_reason_not_blank_check/);
    expect(combinedSql).toMatch(/Location_country_code_check/);
    expect(combinedSql).toMatch(/Location_timezone_not_blank_check/);
    expect(combinedSql).toMatch(/Location_phone_number_check/);
  });

  it("declares the EAPT-004 appointment aggregate and independent state dimensions", async () => {
    const schema = await readFile(schemaPath, "utf8");
    const appointmentModel = getModelBlock(schema, "Appointment");

    expect(schema).toMatch(/enum AppointmentBookingStatus/);
    expect(schema).toMatch(/enum AppointmentConfirmationStatus/);
    expect(schema).toMatch(/enum AppointmentAttendanceStatus/);
    expect(schema).toMatch(/enum AppointmentExecutionStatus/);
    expect(schema).toMatch(/enum AppointmentSourceType/);
    expect(appointmentModel).toMatch(/appointmentNumber\s+String\s+@unique/);
    expect(appointmentModel).toMatch(/ownerUserId\s+String\?/);
    expect(appointmentModel).toMatch(/bookingStatus\s+AppointmentBookingStatus/);
    expect(appointmentModel).toMatch(/confirmationStatus\s+AppointmentConfirmationStatus/);
    expect(appointmentModel).toMatch(/attendanceStatus\s+AppointmentAttendanceStatus/);
    expect(appointmentModel).toMatch(/executionStatus\s+AppointmentExecutionStatus/);
    expect(appointmentModel).toMatch(/version\s+Int\s+@default\(1\)/);
    expect(appointmentModel).toMatch(/purposeSnapshot\s+Json\?/);
    expect(appointmentModel).toMatch(/customerSnapshot\s+Json\?/);
    expect(appointmentModel).toMatch(/vehicleSnapshot\s+Json\?/);
    expect(appointmentModel).toMatch(/sourceSnapshot\s+Json\?/);
    expect(appointmentModel).toMatch(/cancellationReasonCode\s+String\?/);
    expect(appointmentModel).toMatch(/outcomeCode\s+String\?/);
    expect(appointmentModel).toMatch(/followUpDispositionCode\s+String\?/);
    expect(appointmentModel).toMatch(/@@index\(\[locationId,\s*bookingStatus,\s*startsAt\]\)/);
    expect(appointmentModel).toMatch(/@@index\(\[ownerUserId,\s*bookingStatus,\s*startsAt\]\)/);
  });

  it("protects EAPT-004 identity, timing, lifecycle, and documentation invariants in SQL", async () => {
    const migrationEntries = await readdir(migrationsPath, { withFileTypes: true });
    const migrationSqlContents = await Promise.all(
      migrationEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readFile(path.join(migrationsPath, entry.name, "migration.sql"), "utf8"))
    );
    const combinedSql = migrationSqlContents.join("\n");

    expect(combinedSql).toMatch(/Appointment_version_positive_check/);
    expect(combinedSql).toMatch(/Appointment_time_pair_check/);
    expect(combinedSql).toMatch(/Appointment_committed_fields_check/);
    expect(combinedSql).toMatch(/Appointment_cancelled_documentation_check/);
    expect(combinedSql).toMatch(/Appointment_completed_documentation_check/);
    expect(combinedSql).toMatch(/Appointment_declined_documentation_check/);
    expect(combinedSql).toMatch(/Appointment_no_show_documentation_check/);
    expect(combinedSql).toMatch(/Appointment_waiting_documentation_check/);
  });

  it("declares the EAPT-005 participant, customer, vehicle, and resource foundation", async () => {
    const schema = await readFile(schemaPath, "utf8");
    const accessModel = getModelBlock(schema, "UserLocationAccess");
    const customerModel = getModelBlock(schema, "Customer");
    const vehicleModel = getModelBlock(schema, "Vehicle");
    const participantModel = getModelBlock(schema, "AppointmentParticipant");
    const appointmentVehicleModel = getModelBlock(schema, "AppointmentVehicle");
    const resourceTypeModel = getModelBlock(schema, "SchedulableResourceType");
    const resourceModel = getModelBlock(schema, "SchedulableResource");
    const requirementModel = getModelBlock(schema, "AppointmentResourceRequirement");
    const reservationModel = getModelBlock(schema, "AppointmentResourceReservation");

    expect(schema).toMatch(/enum AppointmentParticipantType/);
    expect(schema).toMatch(/enum SchedulableResourceKind/);
    expect(schema).toMatch(/enum ResourceCapacityMode/);
    expect(schema).toMatch(/enum ResourceReservationStatus/);

    expect(accessModel).toMatch(/canOwnAppointments\s+Boolean\s+@default\(false\)/);
    expect(accessModel).toMatch(/canManageAppointments\s+Boolean\s+@default\(false\)/);
    expect(accessModel).toMatch(/canViewLimitedData\s+Boolean\s+@default\(false\)/);
    expect(accessModel).toMatch(/@@id\(\[userId,\s*locationId\]\)/);

    expect(customerModel).toMatch(/customerNumber\s+String\b/);
    expect(customerModel).toMatch(/mergedIntoCustomerId\s+String\?/);
    expect(customerModel).toMatch(/retentionUntil\s+DateTime\?\s+@db\.Date/);
    expect(vehicleModel).toMatch(/vehicleNumber\s+String\b/);
    expect(vehicleModel).toMatch(/vin\s+String\?/);
    expect(vehicleModel).toMatch(/@@unique\(\[organizationId,\s*vin\]\)/);

    expect(participantModel).toMatch(/participantType\s+AppointmentParticipantType/);
    expect(participantModel).toMatch(/displayNameSnapshot\s+String\b/);
    expect(participantModel).toMatch(/contactSnapshot\s+Json\?/);
    expect(appointmentVehicleModel).toMatch(/vehicleSnapshot\s+Json\b/);
    expect(appointmentVehicleModel).toMatch(/exclusiveReservationRequired\s+Boolean/);

    expect(resourceTypeModel).toMatch(/kind\s+SchedulableResourceKind/);
    expect(resourceTypeModel).toMatch(/defaultCapacityMode\s+ResourceCapacityMode/);
    expect(resourceTypeModel).toMatch(/visibilityClass\s+ResourceVisibilityClass/);
    expect(resourceModel).toMatch(/capacityMode\s+ResourceCapacityMode/);
    expect(resourceModel).toMatch(/conflictPolicy\s+ResourceConflictPolicy/);
    expect(resourceModel).toMatch(/operatingWindows\s+ResourceOperatingWindow\[\]/);
    expect(resourceModel).toMatch(/unavailability\s+ResourceUnavailability\[\]/);

    expect(requirementModel).toMatch(/requiredCapacity\s+Int\s+@default\(1\)/);
    expect(requirementModel).toMatch(
      /assignmentTiming\s+ResourceRequirementAssignmentTiming\s+@default\(AT_BOOKING\)/
    );
    expect(reservationModel).toMatch(/status\s+ResourceReservationStatus\s+@default\(PROPOSED\)/);
    expect(reservationModel).toMatch(/capacityUnits\s+Int\s+@default\(1\)/);
    expect(reservationModel).toMatch(/bufferBeforeMinutes\s+Int\s+@default\(0\)/);
  });

  it("protects EAPT-005 cardinality, privacy, capacity, and availability invariants in SQL", async () => {
    const migrationEntries = await readdir(migrationsPath, { withFileTypes: true });
    const migrationSqlContents = await Promise.all(
      migrationEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readFile(path.join(migrationsPath, entry.name, "migration.sql"), "utf8"))
    );
    const combinedSql = migrationSqlContents.join("\n");

    expect(combinedSql).toMatch(/UserLocationAccess_capability_hierarchy_check/);
    expect(combinedSql).toMatch(/Customer_merge_target_check/);
    expect(combinedSql).toMatch(/Customer_merge_same_organization_fkey/);
    expect(combinedSql).toMatch(/Vehicle_vin_format_check/);
    expect(combinedSql).toMatch(/AppointmentParticipant_reference_check/);
    expect(combinedSql).toMatch(/AppointmentParticipant_primary_type_key/);
    expect(combinedSql).toMatch(/AppointmentVehicle_primary_key/);
    expect(combinedSql).toMatch(/ResourceType_exclusive_capacity_check/);
    expect(combinedSql).toMatch(/Resource_exclusive_capacity_check/);
    expect(combinedSql).toMatch(/Resource_location_organization_fkey/);
    expect(combinedSql).toMatch(/Resource_type_organization_fkey/);
    expect(combinedSql).toMatch(/Resource_vehicle_organization_fkey/);
    expect(combinedSql).toMatch(/ResourcePoolMember_not_self_check/);
    expect(combinedSql).toMatch(/ResourceOperatingWindow_minute_range_check/);
    expect(combinedSql).toMatch(/ResourceUnavailability_capacity_check/);
    expect(combinedSql).toMatch(/ResourceRequirement_optional_block_check/);
    expect(combinedSql).toMatch(/ResourceReservation_time_range_check/);
    expect(combinedSql).toMatch(/ResourceReservation_buffer_check/);
  });

  it("declares the EAPT-007 appointment-to-task link foundation", async () => {
    const schema = await readFile(schemaPath, "utf8");
    const appointmentModel = getModelBlock(schema, "Appointment");
    const taskModel = getModelBlock(schema, "Task");
    const appointmentTaskLinkModel = getModelBlock(schema, "AppointmentTaskLink");
    const userModel = getModelBlock(schema, "User");

    expect(schema).toMatch(/enum AppointmentTaskLinkType/);
    expect(schema).toMatch(/SOURCE/);
    expect(schema).toMatch(/PREPARATION/);
    expect(schema).toMatch(/FOLLOW_UP/);

    expect(appointmentModel).toMatch(/taskLinks\s+AppointmentTaskLink\[\]/);
    expect(taskModel).toMatch(/appointmentLinks\s+AppointmentTaskLink\[\]/);
    expect(userModel).toMatch(
      /createdAppointmentTaskLinks\s+AppointmentTaskLink\[\]\s+@relation\("AppointmentTaskLinkCreatedByUser"\)/
    );

    expect(appointmentTaskLinkModel).toMatch(/appointmentId\s+String\b/);
    expect(appointmentTaskLinkModel).toMatch(/taskId\s+String\b/);
    expect(appointmentTaskLinkModel).toMatch(/linkType\s+AppointmentTaskLinkType/);
    expect(appointmentTaskLinkModel).toMatch(/linkCode\s+String\b/);
    expect(appointmentTaskLinkModel).toMatch(/blocksAppointment\s+Boolean\s+@default\(false\)/);
    expect(appointmentTaskLinkModel).toMatch(/blocksTask\s+Boolean\s+@default\(false\)/);
    expect(appointmentTaskLinkModel).toMatch(/automationRuleCode\s+String\?/);
    expect(appointmentTaskLinkModel).toMatch(/templateVersion\s+Int\?/);
    expect(appointmentTaskLinkModel).toMatch(
      /@@unique\(\[appointmentId,\s*taskId,\s*linkCode\]\)/
    );
    expect(appointmentTaskLinkModel).toMatch(/@@index\(\[appointmentId,\s*linkType\]\)/);
    expect(appointmentTaskLinkModel).toMatch(/@@index\(\[taskId,\s*linkType\]\)/);
  });

  it("adds the EAPT-007 appointment-task link table in SQL", async () => {
    const migrationEntries = await readdir(migrationsPath, { withFileTypes: true });
    const migrationSqlContents = await Promise.all(
      migrationEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readFile(path.join(migrationsPath, entry.name, "migration.sql"), "utf8"))
    );
    const combinedSql = migrationSqlContents.join("\n");

    expect(combinedSql).toMatch(/CREATE TYPE "AppointmentTaskLinkType"/);
    expect(combinedSql).toMatch(/CREATE TABLE "AppointmentTaskLink"/);
    expect(combinedSql).toMatch(/AppointmentTaskLink_appointmentId_taskId_linkCode_key/);
    expect(combinedSql).toMatch(/AppointmentTaskLink_appointmentId_fkey/);
    expect(combinedSql).toMatch(/AppointmentTaskLink_taskId_fkey/);
  });

  it("declares the EAPT-008 appointment history event foundation", async () => {
    const schema = await readFile(schemaPath, "utf8");
    const appointmentModel = getModelBlock(schema, "Appointment");
    const taskModel = getModelBlock(schema, "Task");
    const taskLinkModel = getModelBlock(schema, "AppointmentTaskLink");
    const userModel = getModelBlock(schema, "User");
    const historyModel = getModelBlock(schema, "AppointmentHistoryEvent");

    expect(schema).toMatch(/enum AppointmentEventActorType/);
    expect(schema).toMatch(/enum AppointmentHistoryEventType/);
    expect(schema).toMatch(/WARNING_OVERRIDDEN/);
    expect(schema).toMatch(/AUTOMATION_FAILED/);
    expect(schema).toMatch(/NOTIFICATION_QUEUED/);

    expect(appointmentModel).toMatch(/historyEvents\s+AppointmentHistoryEvent\[\]/);
    expect(taskModel).toMatch(/appointmentHistoryEvents\s+AppointmentHistoryEvent\[\]/);
    expect(taskLinkModel).toMatch(/historyEvents\s+AppointmentHistoryEvent\[\]/);
    expect(userModel).toMatch(
      /appointmentHistoryEvents\s+AppointmentHistoryEvent\[\]\s+@relation\("AppointmentHistoryEventActorUser"\)/
    );

    expect(historyModel).toMatch(/appointmentId\s+String\b/);
    expect(historyModel).toMatch(/actorType\s+AppointmentEventActorType/);
    expect(historyModel).toMatch(/actorUserId\s+String\?/);
    expect(historyModel).toMatch(/eventType\s+AppointmentHistoryEventType/);
    expect(historyModel).toMatch(/reasonCode\s+String\?/);
    expect(historyModel).toMatch(/correlationId\s+String\b/);
    expect(historyModel).toMatch(/automationRuleCode\s+String\?/);
    expect(historyModel).toMatch(/automationRuleVersion\s+Int\?/);
    expect(historyModel).toMatch(/priorValue\s+Json\?/);
    expect(historyModel).toMatch(/newValue\s+Json\?/);
    expect(historyModel).toMatch(/notificationIntent\s+Json\?/);
    expect(historyModel).toMatch(/@@index\(\[appointmentId,\s*occurredAt\]\)/);
    expect(historyModel).toMatch(/@@index\(\[correlationId\]\)/);
  });

  it("adds the EAPT-008 appointment history table and audit safeguards in SQL", async () => {
    const migrationEntries = await readdir(migrationsPath, { withFileTypes: true });
    const migrationSqlContents = await Promise.all(
      migrationEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readFile(path.join(migrationsPath, entry.name, "migration.sql"), "utf8"))
    );
    const combinedSql = migrationSqlContents.join("\n");

    expect(combinedSql).toMatch(/CREATE TYPE "AppointmentEventActorType"/);
    expect(combinedSql).toMatch(/CREATE TYPE "AppointmentHistoryEventType"/);
    expect(combinedSql).toMatch(/CREATE TABLE "AppointmentHistoryEvent"/);
    expect(combinedSql).toMatch(/AppointmentHistoryEvent_appointmentId_fkey/);
    expect(combinedSql).toMatch(/AppointmentHistoryEvent_actorUserId_fkey/);
    expect(combinedSql).toMatch(/AppointmentHistoryEvent_message_not_blank_check/);
    expect(combinedSql).toMatch(/AppointmentHistoryEvent_correlation_not_blank_check/);
    expect(combinedSql).toMatch(/AppointmentHistoryEvent_human_actor_check/);
    expect(combinedSql).toMatch(/AppointmentHistoryEvent_automation_version_check/);
  });

  it("declares the EAPT-009 appointment command ledger foundation", async () => {
    const schema = await readFile(schemaPath, "utf8");
    const organizationModel = getModelBlock(schema, "Organization");
    const locationModel = getModelBlock(schema, "Location");
    const appointmentModel = getModelBlock(schema, "Appointment");
    const userModel = getModelBlock(schema, "User");
    const commandLedgerModel = getModelBlock(schema, "AppointmentCommandLedger");

    expect(schema).toMatch(/enum AppointmentCommandType/);
    expect(schema).toMatch(/enum AppointmentCommandStatus/);
    expect(schema).toMatch(/APPROVE/);
    expect(schema).toMatch(/EDIT/);
    expect(schema).toMatch(/RESCHEDULE/);
    expect(schema).toMatch(/FAILED_RETRYABLE/);
    expect(schema).toMatch(/DUPLICATE_RETURNED/);

    expect(organizationModel).toMatch(/appointmentCommandLedgerEntries\s+AppointmentCommandLedger\[\]/);
    expect(locationModel).toMatch(/appointmentCommandLedgerEntries\s+AppointmentCommandLedger\[\]/);
    expect(appointmentModel).toMatch(/commandLedgerEntries\s+AppointmentCommandLedger\[\]/);
    expect(userModel).toMatch(
      /appointmentCommandLedgerEntries\s+AppointmentCommandLedger\[\]\s+@relation\("AppointmentCommandLedgerActorUser"\)/
    );

    expect(commandLedgerModel).toMatch(/organizationId\s+String\b/);
    expect(commandLedgerModel).toMatch(/commandType\s+AppointmentCommandType/);
    expect(commandLedgerModel).toMatch(/status\s+AppointmentCommandStatus\s+@default\(PENDING\)/);
    expect(commandLedgerModel).toMatch(/idempotencyKey\s+String\b/);
    expect(commandLedgerModel).toMatch(/requestHash\s+String\b/);
    expect(commandLedgerModel).toMatch(/correlationId\s+String\b/);
    expect(commandLedgerModel).toMatch(/expectedAppointmentVersion\s+Int\?/);
    expect(commandLedgerModel).toMatch(/currentAppointmentVersion\s+Int\?/);
    expect(commandLedgerModel).toMatch(/attemptCount\s+Int\s+@default\(0\)/);
    expect(commandLedgerModel).toMatch(/maxAttempts\s+Int\s+@default\(0\)/);
    expect(commandLedgerModel).toMatch(/resultSnapshot\s+Json\?/);
    expect(commandLedgerModel).toMatch(
      /@@unique\(\[organizationId,\s*commandType,\s*idempotencyKey\]\)/
    );
    expect(commandLedgerModel).toMatch(/@@index\(\[status,\s*nextRetryAt\]\)/);
  });

  it("adds the EAPT-009 command ledger table and idempotency safeguards in SQL", async () => {
    const migrationEntries = await readdir(migrationsPath, { withFileTypes: true });
    const migrationSqlContents = await Promise.all(
      migrationEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readFile(path.join(migrationsPath, entry.name, "migration.sql"), "utf8"))
    );
    const combinedSql = migrationSqlContents.join("\n");

    expect(combinedSql).toMatch(/CREATE TYPE "AppointmentCommandType"/);
    expect(combinedSql).toMatch(/ADD VALUE IF NOT EXISTS 'APPROVE'/);
    expect(combinedSql).toMatch(/ADD VALUE IF NOT EXISTS 'EDIT'/);
    expect(combinedSql).toMatch(/CREATE TYPE "AppointmentCommandStatus"/);
    expect(combinedSql).toMatch(/CREATE TABLE "AppointmentCommandLedger"/);
    expect(combinedSql).toMatch(/AppointmentCommandLedger_organizationId_commandType_idempotencyKey_key/);
    expect(combinedSql).toMatch(/AppointmentCommandLedger_idempotency_key_not_blank_check/);
    expect(combinedSql).toMatch(/AppointmentCommandLedger_request_hash_not_blank_check/);
    expect(combinedSql).toMatch(/AppointmentCommandLedger_version_positive_check/);
    expect(combinedSql).toMatch(/AppointmentCommandLedger_attempts_check/);
    expect(combinedSql).toMatch(/AppointmentCommandLedger_running_locked_check/);
    expect(combinedSql).toMatch(/AppointmentCommandLedger_success_completed_check/);
    expect(combinedSql).toMatch(/AppointmentCommandLedger_failure_documented_check/);
    expect(combinedSql).toMatch(/AppointmentCommandLedger_retry_schedule_check/);
  });
});
