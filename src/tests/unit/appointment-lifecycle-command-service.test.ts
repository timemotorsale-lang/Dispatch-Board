import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  planAppointmentLifecycleCommandExecution,
  type AppointmentLifecycleCommandAppointment
} from "@/server/appointments/appointment-lifecycle-command-service";
import type { AppointmentHardConflict } from "@/server/appointments/appointment-hard-conflict-service";
import type { AppointmentReservationCommitCandidate } from "@/server/appointments/appointment-reservation-commit-service";
import type { AppointmentWarning } from "@/server/appointments/appointment-warning-service";
import type { AppointmentLocationAccessGrant } from "@/server/policies/access";

const now = new Date("2026-07-06T15:00:00.000Z");
const startsAt = new Date("2026-07-06T16:00:00.000Z");
const endsAt = new Date("2026-07-06T17:00:00.000Z");

const managerUser: AuthenticatedUser = {
  id: "user-manager",
  name: "Abdi Farah",
  email: "manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const ownerUser: AuthenticatedUser = {
  id: "user-owner",
  name: "Brock Peterson",
  email: "owner@local.test",
  isActive: true,
  roles: ["Service Advisor"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const otherUser: AuthenticatedUser = {
  id: "user-other",
  name: "Casey Mechanic",
  email: "other@local.test",
  isActive: true,
  roles: ["Technician"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const managerAccess: AppointmentLocationAccessGrant = {
  canViewSchedule: true,
  canParticipate: true,
  canOwnAppointments: true,
  canManageAppointments: true,
  canViewLimitedData: true
};

const ownerAccess: AppointmentLocationAccessGrant = {
  canViewSchedule: true,
  canParticipate: true,
  canOwnAppointments: true,
  canManageAppointments: false,
  canViewLimitedData: true
};

const appointment: AppointmentLifecycleCommandAppointment = {
  id: "appointment-1",
  appointmentNumber: "APT-10245",
  organizationId: "org-time-motor-sales",
  locationId: "loc-time-motor-sales-minneapolis",
  ownerUserId: ownerUser.id,
  title: "Service / Repair",
  schedulingTimezone: "America/Chicago",
  startsAt: new Date("2026-07-06T15:00:00.000Z"),
  endsAt: new Date("2026-07-06T16:00:00.000Z"),
  bookingStatus: "SCHEDULED",
  confirmationStatus: "CONFIRMED",
  attendanceStatus: "EXPECTED",
  executionStatus: "NOT_STARTED",
  version: 3
};

const reservationCandidate: AppointmentReservationCommitCandidate = {
  appointmentId: appointment.id,
  appointmentLocationId: appointment.locationId,
  requirementCode: "SERVICE_BAY",
  resource: {
    id: "resource-bay-1",
    name: "Service Bay 1",
    status: "ACTIVE",
    capacityMode: "EXCLUSIVE",
    capacity: 1,
    conflictPolicy: "HARD_BLOCK",
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null
  },
  resourceLocationId: appointment.locationId,
  operatingWindows: [],
  unavailability: [],
  startsAt,
  endsAt,
  capacityUnits: 1
};

const hardConflict: AppointmentHardConflict = {
  code: "LOCATION_UNAVAILABLE",
  source: "LOCATION",
  message: "Location is closed for the requested slot."
};

const warning: AppointmentWarning = {
  warningKey: "warning-staff-overlap",
  code: "STAFF_OVERLAP",
  source: "STAFF",
  message: "Staff member has a warning-only overlap.",
  managerOverrideRequired: true,
  staffUserId: ownerUser.id
};

function baseCommand(overrides = {}) {
  return {
    commandId: "cmd-1",
    actor: managerUser,
    locationAccess: managerAccess,
    appointment,
    organizationId: appointment.organizationId,
    locationId: appointment.locationId,
    expectedAppointmentVersion: appointment.version,
    correlationId: "corr-1",
    now,
    ...overrides
  };
}

describe("appointment lifecycle command execution planner", () => {
  it("plans draft creation with appointment, task-link, history, and command-result effects", () => {
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "CREATE_DRAFT",
        appointment: null,
        expectedAppointmentVersion: null,
        payload: {
          appointmentNumber: "APT-20000",
          title: "Test Drive",
          ownerUserId: ownerUser.id,
          schedulingTimezone: "America/Chicago",
          taskLinks: [
            {
              action: "CREATE_LINK",
              taskId: "task-1",
              linkType: "SOURCE",
              linkCode: "SOURCE_TASK",
              blocksAppointment: false,
              appointmentRequiredForTask: true
            }
          ]
        }
      })
    );

    expect(plan).toMatchObject({
      executable: true,
      rejectionCode: null,
      appointmentEffect: {
        operation: "CREATE",
        values: {
          appointmentNumber: "APT-20000",
          bookingStatus: "DRAFT",
          ownerUserId: ownerUser.id,
          createdByUserId: managerUser.id
        }
      },
      taskLinkEffects: [
        {
          action: "CREATE_LINK",
          taskId: "task-1"
        }
      ],
      historyEffects: [
        {
          eventType: "CREATED",
          actorUserId: managerUser.id,
          correlationId: "corr-1"
        }
      ]
    });
  });

  it("rejects scheduling when hard conflicts or unresolved warnings remain", () => {
    const hardBlocked = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "SCHEDULE",
        payload: {
          startsAt,
          endsAt,
          hardConflicts: [hardConflict]
        }
      })
    );
    const warningBlocked = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "SCHEDULE",
        payload: {
          startsAt,
          endsAt,
          unresolvedWarnings: [warning]
        }
      })
    );

    expect(hardBlocked).toMatchObject({
      executable: false,
      rejectionCode: "HARD_CONFLICT",
      rejectionReasons: ["Location is closed for the requested slot."]
    });
    expect(warningBlocked).toMatchObject({
      executable: false,
      rejectionCode: "UNRESOLVED_WARNING",
      rejectionReasons: ["Staff member has a warning-only overlap."]
    });
  });

  it("plans scheduling with reservation commitment only after conflicts are resolved", () => {
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "SCHEDULE",
        payload: {
          startsAt,
          endsAt,
          reservationCandidates: [reservationCandidate],
          warnings: [warning]
        }
      })
    );

    expect(plan).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        appointmentId: appointment.id,
        expectedVersion: appointment.version,
        set: {
          bookingStatus: "SCHEDULED",
          startsAt,
          endsAt
        },
        incrementVersion: 1
      },
      reservationEffects: [
        {
          action: "COMMIT_RESERVATIONS",
          candidates: [reservationCandidate],
          allowWarningCommit: true
        }
      ],
      historyEffects: [
        {
          eventType: "SCHEDULED"
        }
      ]
    });
  });

  it("plans manager-only approval as scheduling commitment with approved history", () => {
    const pendingAppointment: AppointmentLifecycleCommandAppointment = {
      ...appointment,
      bookingStatus: "PENDING_APPROVAL"
    };
    const unauthorized = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "APPROVE",
        actor: ownerUser,
        locationAccess: ownerAccess,
        appointment: pendingAppointment,
        payload: {
          startsAt,
          endsAt
        }
      })
    );
    const approved = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "APPROVE",
        appointment: pendingAppointment,
        payload: {
          startsAt,
          endsAt,
          reservationCandidates: [reservationCandidate]
        }
      })
    );

    expect(unauthorized).toMatchObject({
      executable: false,
      rejectionCode: "UNAUTHORIZED"
    });
    expect(approved).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        appointmentId: appointment.id,
        set: {
          bookingStatus: "SCHEDULED",
          startsAt,
          endsAt
        }
      },
      reservationEffects: [
        {
          action: "COMMIT_RESERVATIONS",
          candidates: [reservationCandidate]
        }
      ],
      historyEffects: [
        {
          eventType: "APPROVED",
          actorUserId: managerUser.id
        }
      ]
    });
  });

  it("plans detail edits without allowing time changes to bypass rescheduling", () => {
    const edited = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "EDIT",
        actor: ownerUser,
        locationAccess: ownerAccess,
        payload: {
          title: "Updated Service / Repair",
          customerSnapshot: {
            displayName: "Ahmed Ibrahim"
          }
        }
      })
    );
    const timeChange = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "EDIT",
        actor: ownerUser,
        locationAccess: ownerAccess,
        payload: {
          startsAt,
          endsAt
        }
      })
    );

    expect(edited).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        appointmentId: appointment.id,
        set: {
          title: "Updated Service / Repair",
          customerSnapshot: {
            displayName: "Ahmed Ibrahim"
          }
        }
      },
      historyEffects: [
        {
          eventType: "FIELD_UPDATED",
          actorUserId: ownerUser.id
        }
      ],
      commandResultSnapshot: {
        editedFields: ["title", "customerSnapshot"]
      }
    });
    expect(timeChange).toMatchObject({
      executable: false,
      rejectionCode: "USE_RESCHEDULE",
      rejectionReasons: ["EDIT cannot change appointment time. Use RESCHEDULE for time changes."]
    });
  });

  it("plans rescheduling as release plus recommit with required reasoned history", () => {
    const releaseReservation = {
      id: "reservation-old",
      resourceId: "resource-bay-1",
      status: "COMMITTED" as const
    };
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "RESCHEDULE",
        payload: {
          startsAt,
          endsAt,
          reasonCode: "CUSTOMER_REQUEST",
          reasonNotes: "Customer requested a later appointment.",
          releaseReservations: [releaseReservation],
          reservationCandidates: [reservationCandidate]
        }
      })
    );

    expect(plan).toMatchObject({
      executable: true,
      reservationEffects: [
        {
          action: "RELEASE_RESERVATIONS",
          reservations: [releaseReservation],
          reasonCode: "CUSTOMER_REQUEST",
          reasonNotes: "Customer requested a later appointment.",
          releasedByUserId: managerUser.id
        },
        {
          action: "COMMIT_RESERVATIONS",
          candidates: [reservationCandidate]
        }
      ],
      historyEffects: [
        {
          eventType: "RESCHEDULED",
          reasonCode: "CUSTOMER_REQUEST",
          reasonNotes: "Customer requested a later appointment.",
          priorValue: {
            startsAt: appointment.startsAt,
            endsAt: appointment.endsAt
          }
        }
      ]
    });
  });

  it("plans cancellation with follow-up disposition, capacity release, and cancellation history", () => {
    const releaseReservation = {
      id: "reservation-old",
      resourceId: "resource-bay-1",
      status: "COMMITTED" as const
    };
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "CANCEL",
        actor: ownerUser,
        locationAccess: ownerAccess,
        payload: {
          reasonCode: "CUSTOMER_CANCELLED",
          reasonNotes: "Customer called to cancel.",
          followUpDispositionCode: "CALLBACK_NOT_REQUIRED",
          releaseReservations: [releaseReservation]
        }
      })
    );

    expect(plan).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        appointmentId: appointment.id,
        set: {
          bookingStatus: "CANCELLED",
          cancellationReasonCode: "CUSTOMER_CANCELLED",
          cancellationReasonNotes: "Customer called to cancel.",
          followUpDispositionCode: "CALLBACK_NOT_REQUIRED",
          cancelledAt: now
        }
      },
      reservationEffects: [
        {
          action: "RELEASE_RESERVATIONS",
          reservations: [releaseReservation],
          reasonCode: "CUSTOMER_CANCELLED",
          reasonNotes: "Customer called to cancel.",
          releasedByUserId: ownerUser.id
        }
      ],
      historyEffects: [
        {
          eventType: "CANCELLED",
          actorUserId: ownerUser.id
        }
      ]
    });
  });

  it("plans confirmation and customer decline with reasoned follow-up", () => {
    const confirmed = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "CONFIRM",
        actor: ownerUser,
        locationAccess: ownerAccess
      })
    );
    const declined = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "DECLINE",
        payload: {
          reasonCode: "CUSTOMER_DECLINED",
          reasonNotes: "Customer declined the proposed appointment.",
          followUpDispositionCode: "CALLBACK_REQUIRED"
        }
      })
    );

    expect(confirmed).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        appointmentId: appointment.id,
        set: {
          confirmationStatus: "CONFIRMED",
          confirmedAt: now
        }
      },
      historyEffects: [
        {
          eventType: "CONFIRMED",
          actorUserId: ownerUser.id
        }
      ]
    });
    expect(declined).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        appointmentId: appointment.id,
        set: {
          confirmationStatus: "DECLINED",
          declinedAt: now,
          confirmationDeclineReasonCode: "CUSTOMER_DECLINED",
          confirmationDeclineReasonNotes: "Customer declined the proposed appointment.",
          followUpDispositionCode: "CALLBACK_REQUIRED"
        }
      },
      historyEffects: [
        {
          eventType: "DECLINED",
          reasonCode: "CUSTOMER_DECLINED"
        }
      ]
    });
  });

  it("plans check-in and blocks check-in after a no-show is recorded", () => {
    const checkedIn = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "CHECK_IN",
        actor: ownerUser,
        locationAccess: ownerAccess
      })
    );
    const blocked = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "CHECK_IN",
        appointment: {
          ...appointment,
          attendanceStatus: "NO_SHOW"
        }
      })
    );

    expect(checkedIn).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        appointmentId: appointment.id,
        set: {
          attendanceStatus: "CHECKED_IN",
          checkedInAt: now
        }
      },
      historyEffects: [
        {
          eventType: "CHECKED_IN",
          actorUserId: ownerUser.id
        }
      ]
    });
    expect(blocked).toMatchObject({
      executable: false,
      rejectionCode: "NO_SHOW_RECORDED"
    });
  });

  it("plans no-show with reason, follow-up disposition, and optional reservation release", () => {
    const releaseReservation = {
      id: "reservation-old",
      resourceId: "resource-bay-1",
      status: "COMMITTED" as const
    };
    const plan = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "NO_SHOW",
        payload: {
          reasonCode: "CUSTOMER_NO_SHOW",
          reasonNotes: "Customer did not arrive by the grace period.",
          followUpDispositionCode: "CALLBACK_REQUIRED",
          releaseReservations: [releaseReservation]
        }
      })
    );

    expect(plan).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        appointmentId: appointment.id,
        set: {
          attendanceStatus: "NO_SHOW",
          executionStatus: "NOT_STARTED",
          noShowAt: now,
          noShowReasonCode: "CUSTOMER_NO_SHOW",
          noShowReasonNotes: "Customer did not arrive by the grace period.",
          followUpDispositionCode: "CALLBACK_REQUIRED"
        }
      },
      reservationEffects: [
        {
          action: "RELEASE_RESERVATIONS",
          reservations: [releaseReservation],
          reasonCode: "CUSTOMER_NO_SHOW",
          releasedByUserId: managerUser.id
        }
      ],
      historyEffects: [
        {
          eventType: "NO_SHOW_RECORDED",
          reasonCode: "CUSTOMER_NO_SHOW"
        }
      ]
    });
  });

  it("plans execution start, wait, and finish transitions with required wait reason", () => {
    const started = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "START"
      })
    );
    const waiting = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "WAIT",
        appointment: {
          ...appointment,
          executionStatus: "IN_PROGRESS"
        },
        payload: {
          reasonCode: "WAITING_ON_PARTS",
          reasonNotes: "Waiting for ordered brake pads."
        }
      })
    );
    const finished = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "FINISH",
        appointment: {
          ...appointment,
          executionStatus: "WAITING"
        }
      })
    );
    const blocked = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "FINISH",
        appointment: {
          ...appointment,
          executionStatus: "NOT_STARTED"
        }
      })
    );

    expect(started).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        set: {
          executionStatus: "IN_PROGRESS",
          startedAt: now
        }
      },
      historyEffects: [
        {
          eventType: "STARTED"
        }
      ]
    });
    expect(waiting).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        set: {
          executionStatus: "WAITING",
          waitingAt: now,
          waitingReasonCode: "WAITING_ON_PARTS",
          waitingReasonNotes: "Waiting for ordered brake pads."
        }
      },
      historyEffects: [
        {
          eventType: "WAITING",
          reasonCode: "WAITING_ON_PARTS"
        }
      ]
    });
    expect(finished).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        set: {
          executionStatus: "FINISHED",
          finishedAt: now
        }
      },
      historyEffects: [
        {
          eventType: "FINISHED"
        }
      ]
    });
    expect(blocked).toMatchObject({
      executable: false,
      rejectionCode: "EXECUTION_NOT_STARTED"
    });
  });

  it("keeps ownership transfer manager-only and stale-version protected", () => {
    const unauthorized = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "TRANSFER_OWNER",
        actor: ownerUser,
        locationAccess: ownerAccess,
        payload: {
          ownerUserId: otherUser.id,
          reasonCode: "WORKLOAD_BALANCE",
          reasonNotes: "Move to another staff member."
        }
      })
    );
    const stale = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "TRANSFER_OWNER",
        expectedAppointmentVersion: 2,
        payload: {
          ownerUserId: otherUser.id,
          reasonCode: "WORKLOAD_BALANCE",
          reasonNotes: "Move to another staff member."
        }
      })
    );
    const authorized = planAppointmentLifecycleCommandExecution(
      baseCommand({
        commandType: "TRANSFER_OWNER",
        payload: {
          ownerUserId: otherUser.id,
          reasonCode: "WORKLOAD_BALANCE",
          reasonNotes: "Move to another staff member."
        }
      })
    );

    expect(unauthorized).toMatchObject({
      executable: false,
      rejectionCode: "UNAUTHORIZED"
    });
    expect(stale).toMatchObject({
      executable: false,
      rejectionCode: "STALE_VERSION"
    });
    expect(authorized).toMatchObject({
      executable: true,
      appointmentEffect: {
        operation: "UPDATE",
        set: {
          ownerUserId: otherUser.id
        }
      },
      historyEffects: [
        {
          eventType: "OWNER_CHANGED",
          reasonCode: "WORKLOAD_BALANCE"
        }
      ]
    });
  });
});
