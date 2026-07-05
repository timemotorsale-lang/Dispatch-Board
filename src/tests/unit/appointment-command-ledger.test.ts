import { describe, expect, it } from "vitest";

import {
  APPOINTMENT_COMMAND_STATUSES,
  APPOINTMENT_COMMAND_TYPES
} from "@/server/appointments/appointment-domain";
import {
  assertAppointmentVersionForCommand,
  normalizeAppointmentCommandLedgerEntry,
  type AppointmentCommandLedgerInput
} from "@/server/validation/appointment-command-ledger";

const baseCommand: AppointmentCommandLedgerInput = {
  organizationId: "org-1",
  locationId: "location-1",
  appointmentId: "appointment-1",
  actorUserId: "user-manager",
  commandType: "RESCHEDULE",
  idempotencyKey: "reschedule-appointment-1-2026-07-06T14:00:00Z",
  requestHash: "sha256:abc123",
  correlationId: "corr-command-1",
  expectedAppointmentVersion: 3,
  attemptCount: 0,
  maxAttempts: 3
};

describe("appointment command ledger foundation", () => {
  it("keeps command type and status catalogs explicit", () => {
    expect(APPOINTMENT_COMMAND_TYPES).toEqual([
      "CREATE_DRAFT",
      "SCHEDULE",
      "RESCHEDULE",
      "CANCEL",
      "COMPLETE",
      "CONFIRM",
      "DECLINE",
      "CHECK_IN",
      "NO_SHOW",
      "START",
      "WAIT",
      "FINISH",
      "TRANSFER_OWNER",
      "OVERRIDE_WARNING",
      "LINK_TASK",
      "UNLINK_TASK",
      "AUTOMATION_RUN",
      "BULK_RESCHEDULE",
      "IMPORT"
    ]);
    expect(APPOINTMENT_COMMAND_STATUSES).toEqual([
      "PENDING",
      "RUNNING",
      "SUCCEEDED",
      "FAILED_RETRYABLE",
      "FAILED_TERMINAL",
      "CONFLICT",
      "DUPLICATE_RETURNED",
      "CANCELLED"
    ]);
  });

  it("normalizes an idempotent pending mutation command", () => {
    expect(normalizeAppointmentCommandLedgerEntry(baseCommand)).toMatchObject({
      organizationId: "org-1",
      locationId: "location-1",
      appointmentId: "appointment-1",
      actorUserId: "user-manager",
      commandType: "RESCHEDULE",
      status: "PENDING",
      idempotencyKey: "reschedule-appointment-1-2026-07-06T14:00:00Z",
      requestHash: "sha256:abc123",
      correlationId: "corr-command-1",
      expectedAppointmentVersion: 3,
      attemptCount: 0,
      maxAttempts: 3
    });
  });

  it("requires expected appointment versions for existing-appointment mutation commands", () => {
    expect(() =>
      normalizeAppointmentCommandLedgerEntry({
        ...baseCommand,
        expectedAppointmentVersion: null
      })
    ).toThrow(/expected appointment version/);

    expect(
      normalizeAppointmentCommandLedgerEntry({
        ...baseCommand,
        appointmentId: null,
        commandType: "CREATE_DRAFT",
        expectedAppointmentVersion: null
      })
    ).toMatchObject({
      commandType: "CREATE_DRAFT",
      expectedAppointmentVersion: null
    });
  });

  it("rejects stale appointment commands before mutation", () => {
    expect(assertAppointmentVersionForCommand({ expectedVersion: 4, currentVersion: 4 })).toBe(4);
    expect(() =>
      assertAppointmentVersionForCommand({ expectedVersion: 3, currentVersion: 4 })
    ).toThrow(/Stale appointment command/);
  });

  it("requires lifecycle-specific timestamps for running, succeeded, failed, and retryable states", () => {
    expect(() =>
      normalizeAppointmentCommandLedgerEntry({ ...baseCommand, status: "RUNNING" })
    ).toThrow(/lock time/);

    expect(() =>
      normalizeAppointmentCommandLedgerEntry({ ...baseCommand, status: "SUCCEEDED" })
    ).toThrow(/completion time/);

    expect(() =>
      normalizeAppointmentCommandLedgerEntry({
        ...baseCommand,
        status: "FAILED_TERMINAL",
        failedAt: new Date("2026-07-06T15:00:00.000Z")
      })
    ).toThrow(/error code/);

    expect(() =>
      normalizeAppointmentCommandLedgerEntry({
        ...baseCommand,
        status: "FAILED_RETRYABLE",
        failedAt: new Date("2026-07-06T15:00:00.000Z"),
        errorCode: "TRANSIENT_LOCK"
      })
    ).toThrow(/next retry time/);
  });

  it("records retryable failures, conflicts, and successful results with required fields", () => {
    expect(
      normalizeAppointmentCommandLedgerEntry({
        ...baseCommand,
        status: "FAILED_RETRYABLE",
        failedAt: new Date("2026-07-06T15:00:00.000Z"),
        errorCode: "transient_lock",
        errorMessage: "Could not acquire resource lock.",
        nextRetryAt: new Date("2026-07-06T15:05:00.000Z"),
        attemptCount: 1,
        maxAttempts: 3
      })
    ).toMatchObject({
      status: "FAILED_RETRYABLE",
      errorCode: "TRANSIENT_LOCK",
      attemptCount: 1
    });

    expect(
      normalizeAppointmentCommandLedgerEntry({
        ...baseCommand,
        status: "CONFLICT",
        failedAt: new Date("2026-07-06T15:00:00.000Z"),
        errorCode: "STALE_VERSION",
        currentAppointmentVersion: 4
      })
    ).toMatchObject({
      status: "CONFLICT",
      currentAppointmentVersion: 4
    });

    expect(
      normalizeAppointmentCommandLedgerEntry({
        ...baseCommand,
        status: "SUCCEEDED",
        completedAt: new Date("2026-07-06T15:00:00.000Z"),
        resultSnapshot: {
          appointmentId: "appointment-1",
          version: 4
        }
      })
    ).toMatchObject({
      status: "SUCCEEDED",
      resultSnapshot: {
        appointmentId: "appointment-1",
        version: 4
      }
    });
  });

  it("rejects impossible retry counters and malformed error codes", () => {
    expect(() =>
      normalizeAppointmentCommandLedgerEntry({
        ...baseCommand,
        attemptCount: 4,
        maxAttempts: 3
      })
    ).toThrow(/attempt count cannot exceed/);

    expect(() =>
      normalizeAppointmentCommandLedgerEntry({
        ...baseCommand,
        status: "FAILED_TERMINAL",
        failedAt: new Date("2026-07-06T15:00:00.000Z"),
        errorCode: "bad code"
      })
    ).toThrow(/single underscores/);
  });
});
