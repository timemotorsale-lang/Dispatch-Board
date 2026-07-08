import { PrismaClient } from "@prisma/client";

import type {
  AppointmentAttendanceStatus,
  AppointmentBookingStatus,
  AppointmentConfirmationStatus,
  AppointmentExecutionStatus,
  AppointmentSourceType,
  AppointmentTaskLinkType
} from "@/server/appointments/appointment-domain";
import { prisma } from "@/server/db/client";

type AppointmentReadDatabase = Pick<
  PrismaClient,
  "appointment" | "userLocationAccess" | "appointmentAutomationExecution"
>;

const appointmentReadSelect = {
  id: true,
  appointmentNumber: true,
  organizationId: true,
  locationId: true,
  ownerUserId: true,
  createdByUserId: true,
  sourceType: true,
  sourceReference: true,
  title: true,
  schedulingTimezone: true,
  startsAt: true,
  endsAt: true,
  bookingStatus: true,
  confirmationStatus: true,
  attendanceStatus: true,
  executionStatus: true,
  version: true,
  purposeSnapshot: true,
  customerSnapshot: true,
  vehicleSnapshot: true,
  sourceSnapshot: true,
  cancelledAt: true,
  completedAt: true,
  outcomeCode: true,
  outcomeNotes: true,
  followUpDispositionCode: true,
  followUpNotes: true,
  createdAt: true,
  updatedAt: true,
  ownerUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  participants: {
    select: {
      id: true,
      participantType: true,
      roleCode: true,
      userId: true,
      customerId: true,
      displayNameSnapshot: true,
      contactSnapshot: true,
      isRequired: true,
      isPrimary: true,
      attendanceRequired: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      customer: {
        select: {
          id: true,
          customerNumber: true,
          displayName: true,
          phoneNumber: true,
          email: true
        }
      }
    }
  },
  vehicles: {
    select: {
      id: true,
      vehicleId: true,
      roleCode: true,
      vehicleSnapshot: true,
      isPrimary: true,
      isRequired: true,
      exclusiveReservationRequired: true,
      vehicle: {
        select: {
          id: true,
          vehicleNumber: true,
          vin: true,
          stockNumber: true,
          year: true,
          make: true,
          model: true,
          licensePlate: true
        }
      }
    }
  },
  taskLinks: {
    select: {
      id: true,
      taskId: true,
      linkType: true,
      linkCode: true,
      title: true,
      explanation: true,
      isRequired: true,
      blocksAppointment: true,
      blocksTask: true,
      createdAt: true,
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          dueAt: true,
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  },
  resourceReservations: {
    select: {
      id: true,
      resourceId: true,
      status: true,
      startsAt: true,
      endsAt: true,
      capacityUnits: true,
      resource: {
        select: {
          id: true,
          code: true,
          name: true
        }
      }
    }
  }
} as const;

const appointmentReadLocationAccessSelect = {
  userId: true,
  locationId: true,
  canViewSchedule: true,
  canParticipate: true,
  canOwnAppointments: true,
  canManageAppointments: true,
  canViewLimitedData: true,
  validFrom: true,
  validTo: true
} as const;

const appointmentReadAutomationExecutionSelect = {
  id: true,
  automationRuleId: true,
  triggerCode: true,
  purposeCode: true,
  status: true,
  sourceType: true,
  sourceReference: true,
  inputSnapshot: true,
  resultSnapshot: true,
  failureCode: true,
  failureMessage: true,
  attemptCount: true,
  maxAttempts: true,
  nextRetryAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true
} as const;

export type AppointmentReadUserSummaryRecord = {
  id: string;
  name: string;
  email: string;
};

export type AppointmentReadParticipantRecord = {
  id: string;
  participantType: string;
  roleCode: string;
  userId: string | null;
  customerId: string | null;
  displayNameSnapshot: string;
  contactSnapshot: unknown;
  isRequired: boolean;
  isPrimary: boolean;
  attendanceRequired: boolean;
  user: AppointmentReadUserSummaryRecord | null;
  customer: {
    id: string;
    customerNumber: string;
    displayName: string;
    phoneNumber: string | null;
    email: string | null;
  } | null;
};

export type AppointmentReadVehicleRecord = {
  id: string;
  vehicleId: string;
  roleCode: string;
  vehicleSnapshot: unknown;
  isPrimary: boolean;
  isRequired: boolean;
  exclusiveReservationRequired: boolean;
  vehicle: {
    id: string;
    vehicleNumber: string;
    vin: string | null;
    stockNumber: string | null;
    year: number | null;
    make: string | null;
    model: string | null;
    licensePlate: string | null;
  };
};

export type AppointmentReadTaskLinkRecord = {
  id: string;
  taskId: string;
  linkType: AppointmentTaskLinkType;
  linkCode: string;
  title: string;
  explanation: string | null;
  isRequired: boolean;
  blocksAppointment: boolean;
  blocksTask: boolean;
  createdAt: Date;
  task: {
    id: string;
    title: string;
    status: string;
    dueAt: Date;
    assignedUser: AppointmentReadUserSummaryRecord;
  };
};

export type AppointmentReadResourceReservationRecord = {
  id: string;
  resourceId: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  capacityUnits: number;
  resource: {
    id: string;
    code: string;
    name: string;
  };
};

export type AppointmentReadAutomationExecutionRecord = {
  id: string;
  automationRuleId: string | null;
  triggerCode: string;
  purposeCode: string | null;
  status: string;
  sourceType: string;
  sourceReference: string | null;
  inputSnapshot: unknown;
  resultSnapshot: unknown;
  failureCode: string | null;
  failureMessage: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AppointmentReadAppointmentRecord = {
  id: string;
  appointmentNumber: string;
  organizationId: string;
  locationId: string;
  ownerUserId: string | null;
  createdByUserId: string | null;
  sourceType: AppointmentSourceType;
  sourceReference: string | null;
  title: string;
  schedulingTimezone: string;
  startsAt: Date | null;
  endsAt: Date | null;
  bookingStatus: AppointmentBookingStatus;
  confirmationStatus: AppointmentConfirmationStatus;
  attendanceStatus: AppointmentAttendanceStatus;
  executionStatus: AppointmentExecutionStatus;
  version: number;
  purposeSnapshot: unknown;
  customerSnapshot: unknown;
  vehicleSnapshot: unknown;
  sourceSnapshot: unknown;
  cancelledAt: Date | null;
  completedAt: Date | null;
  outcomeCode: string | null;
  outcomeNotes: string | null;
  followUpDispositionCode: string | null;
  followUpNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerUser: AppointmentReadUserSummaryRecord | null;
  participants: AppointmentReadParticipantRecord[];
  vehicles: AppointmentReadVehicleRecord[];
  taskLinks: AppointmentReadTaskLinkRecord[];
  resourceReservations: AppointmentReadResourceReservationRecord[];
  automationExecutions: AppointmentReadAutomationExecutionRecord[];
};

export type AppointmentReadLocationAccessRecord = {
  userId: string;
  locationId: string;
  canViewSchedule: boolean;
  canParticipate: boolean;
  canOwnAppointments: boolean;
  canManageAppointments: boolean;
  canViewLimitedData: boolean;
  validFrom: Date;
  validTo: Date | null;
};

export type AppointmentReadQueryInput = {
  locationId: string;
  windowStart: Date;
  windowEnd: Date;
  includeCancelled?: boolean;
};

export type AppointmentReadRepository = {
  findActiveLocationAccess(
    userId: string,
    locationId: string,
    at: Date
  ): Promise<AppointmentReadLocationAccessRecord | null>;
  listAppointmentsForLocationWindow(
    input: AppointmentReadQueryInput
  ): Promise<AppointmentReadAppointmentRecord[]>;
};

function isDateWithinAccessWindow(access: AppointmentReadLocationAccessRecord, at: Date) {
  return access.validFrom <= at && (!access.validTo || access.validTo >= at);
}

export function createAppointmentReadRepository(
  database: AppointmentReadDatabase = prisma
): AppointmentReadRepository {
  return {
    async findActiveLocationAccess(userId, locationId, at) {
      const access = await database.userLocationAccess.findUnique({
        where: {
          userId_locationId: {
            userId,
            locationId
          }
        },
        select: appointmentReadLocationAccessSelect
      });

      if (!access || !isDateWithinAccessWindow(access, at)) {
        return null;
      }

      return access;
    },

    async listAppointmentsForLocationWindow(input) {
      const appointments = await database.appointment.findMany({
        where: {
          locationId: input.locationId,
          OR: [
            {
              startsAt: {
                lt: input.windowEnd
              },
              endsAt: {
                gt: input.windowStart
              }
            },
            {
              bookingStatus: {
                in: ["DRAFT", "PENDING_APPROVAL"]
              },
              startsAt: null,
              endsAt: null
            }
          ],
          ...(input.includeCancelled
            ? {}
            : {
                bookingStatus: {
                  not: "CANCELLED"
                }
              })
        },
        select: appointmentReadSelect,
        orderBy: [{ startsAt: "asc" }, { appointmentNumber: "asc" }, { id: "asc" }]
      });

      if (appointments.length === 0) {
        return [];
      }

      const appointmentIds = appointments.map((appointment) => appointment.id);
      const automationExecutions = await database.appointmentAutomationExecution.findMany({
        where: {
          sourceType: "APPOINTMENT",
          sourceReference: {
            in: appointmentIds
          }
        },
        select: appointmentReadAutomationExecutionSelect,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
      });
      const automationExecutionsByAppointmentId = new Map<
        string,
        AppointmentReadAutomationExecutionRecord[]
      >();

      for (const execution of automationExecutions) {
        if (!execution.sourceReference) {
          continue;
        }

        const records = automationExecutionsByAppointmentId.get(execution.sourceReference) ?? [];

        if (records.length < 5) {
          records.push(execution);
          automationExecutionsByAppointmentId.set(execution.sourceReference, records);
        }
      }

      return appointments.map((appointment) => ({
        ...appointment,
        automationExecutions: automationExecutionsByAppointmentId.get(appointment.id) ?? []
      }));
    }
  };
}
