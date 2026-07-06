import { Prisma, PrismaClient } from "@prisma/client";

import type {
  AppointmentLifecycleAppointmentCreateEffect,
  AppointmentLifecycleAppointmentUpdateEffect
} from "@/server/appointments/appointment-lifecycle-command-service";
import type {
  AppointmentCommittedResourceReservation,
  AppointmentReservationReleaseRecord
} from "@/server/appointments/appointment-reservation-commit-service";
import {
  type AppointmentLifecycleCommandLedgerCompletion,
  type AppointmentLifecyclePersistedAppointment,
  type AppointmentLifecyclePersistedHistoryEvent,
  type AppointmentLifecyclePersistedTaskLink,
  type AppointmentLifecycleTransaction,
  type AppointmentLifecycleTransactionRepository
} from "@/server/appointments/appointment-lifecycle-transaction-service";
import { prisma } from "@/server/db/client";
import type { normalizeAppointmentHistoryEvent } from "@/server/validation/appointment-history-events";
import type { normalizeAppointmentTaskLink } from "@/server/validation/appointment-task-links";

type AppointmentLifecycleDatabase = Pick<PrismaClient, "$transaction">;

type AppointmentLifecycleTransactionClient = {
  appointment: {
    create(input: {
      data: Record<string, unknown>;
      select: typeof persistedAppointmentSelect;
    }): Promise<AppointmentLifecyclePersistedAppointment>;
    findUnique(input: {
      where: { id: string };
      select: typeof persistedAppointmentSelect;
    }): Promise<AppointmentLifecyclePersistedAppointment | null>;
    updateMany(input: {
      where: { id: string; version: number };
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
  appointmentResourceReservation: {
    create(input: {
      data: Record<string, unknown>;
      select: typeof persistedReservationSelect;
    }): Promise<AppointmentCommittedResourceReservation>;
    findUnique(input: {
      where: { id: string };
      select: typeof persistedReservationSelect;
    }): Promise<AppointmentCommittedResourceReservation | null>;
    findMany(input: {
      where: { id: { in: string[] }; status: { in: string[] } };
      select: typeof releaseReservationSelect;
    }): Promise<Array<{ id: string; resourceId: string; status: string }>>;
    updateMany(input: {
      where: { id: { in: string[] }; status: { in: string[] } };
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
  appointmentTaskLink: {
    create(input: {
      data: Record<string, unknown>;
      select: typeof persistedTaskLinkSelect;
    }): Promise<AppointmentLifecyclePersistedTaskLink>;
    findMany(input: {
      where: { appointmentId: string; OR: Array<{ taskId: string; linkCode: string }> };
      select: typeof persistedTaskLinkSelect;
    }): Promise<AppointmentLifecyclePersistedTaskLink[]>;
    deleteMany(input: {
      where: { id: { in: string[] } };
    }): Promise<{ count: number }>;
  };
  appointmentHistoryEvent: {
    create(input: {
      data: Record<string, unknown>;
      select: typeof persistedHistoryEventSelect;
    }): Promise<AppointmentLifecyclePersistedHistoryEvent>;
  };
  appointmentCommandLedger: {
    update(input: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof commandCompletionSelect;
    }): Promise<
      Omit<AppointmentLifecycleCommandLedgerCompletion, "commandId" | "resultSnapshot"> & {
        id: string;
        resultSnapshot: unknown;
      }
    >;
  };
};

const persistedAppointmentSelect = {
  id: true,
  appointmentNumber: true,
  version: true
} as const;

const persistedReservationSelect = {
  id: true,
  appointmentId: true,
  requirementId: true,
  resourceId: true,
  status: true,
  startsAt: true,
  endsAt: true,
  capacityUnits: true,
  bufferBeforeMinutes: true,
  bufferAfterMinutes: true,
  createdAt: true,
  updatedAt: true
} as const;

const releaseReservationSelect = {
  id: true,
  resourceId: true,
  status: true
} as const;

const persistedTaskLinkSelect = {
  id: true,
  appointmentId: true,
  taskId: true,
  linkCode: true
} as const;

const persistedHistoryEventSelect = {
  id: true,
  appointmentId: true,
  eventType: true
} as const;

const commandCompletionSelect = {
  id: true,
  status: true,
  appointmentId: true,
  completedAt: true,
  failedAt: true,
  resultSnapshot: true,
  errorCode: true,
  errorMessage: true
} as const;

function asInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function optionalJson(value: unknown) {
  return value === null || value === undefined ? Prisma.JsonNull : asInputJson(value);
}

function toAppointmentCreateData(effect: AppointmentLifecycleAppointmentCreateEffect) {
  return {
    appointmentNumber: effect.values.appointmentNumber,
    organizationId: effect.values.organizationId,
    locationId: effect.values.locationId,
    ...(effect.values.ownerUserId ? { ownerUserId: effect.values.ownerUserId } : {}),
    ...(effect.values.createdByUserId ? { createdByUserId: effect.values.createdByUserId } : {}),
    sourceType: effect.values.sourceType,
    ...(effect.values.sourceReference ? { sourceReference: effect.values.sourceReference } : {}),
    title: effect.values.title,
    schedulingTimezone: effect.values.schedulingTimezone,
    startsAt: effect.values.startsAt,
    endsAt: effect.values.endsAt,
    bookingStatus: effect.values.bookingStatus,
    version: effect.values.version,
    purposeSnapshot: optionalJson(effect.values.purposeSnapshot),
    customerSnapshot: optionalJson(effect.values.customerSnapshot),
    vehicleSnapshot: optionalJson(effect.values.vehicleSnapshot),
    sourceSnapshot: optionalJson(effect.values.sourceSnapshot)
  };
}

function toAppointmentUpdateData(effect: AppointmentLifecycleAppointmentUpdateEffect) {
  const data: Record<string, unknown> = {
    version: {
      increment: effect.incrementVersion
    }
  };

  for (const [key, value] of Object.entries(effect.set)) {
    if (
      key === "purposeSnapshot" ||
      key === "customerSnapshot" ||
      key === "vehicleSnapshot" ||
      key === "sourceSnapshot"
    ) {
      data[key] = optionalJson(value);
      continue;
    }

    data[key] = value;
  }

  return data;
}

async function createAppointment(input: {
  tx: AppointmentLifecycleTransactionClient;
  effect: AppointmentLifecycleAppointmentCreateEffect;
}) {
  return input.tx.appointment.create({
    data: toAppointmentCreateData(input.effect),
    select: persistedAppointmentSelect
  });
}

async function updateAppointment(input: {
  tx: AppointmentLifecycleTransactionClient;
  effect: AppointmentLifecycleAppointmentUpdateEffect;
}) {
  const result = await input.tx.appointment.updateMany({
    where: {
      id: input.effect.appointmentId,
      version: input.effect.expectedVersion
    },
    data: toAppointmentUpdateData(input.effect)
  });

  if (result.count !== 1) {
    throw new Error("Appointment update failed because the expected version no longer matches.");
  }

  const appointment = await input.tx.appointment.findUnique({
    where: {
      id: input.effect.appointmentId
    },
    select: persistedAppointmentSelect
  });

  if (!appointment) {
    throw new Error("Appointment update failed because the appointment could not be reloaded.");
  }

  return appointment;
}

function toReservationData(
  candidate: Parameters<AppointmentLifecycleTransaction["commitReservations"]>[0]["candidates"][number]
) {
  return {
    appointmentId: candidate.appointmentId,
    ...(candidate.requirementId ? { requirementId: candidate.requirementId } : {}),
    resourceId: candidate.resource.id,
    status: candidate.status ?? "COMMITTED",
    startsAt: candidate.startsAt,
    endsAt: candidate.endsAt,
    capacityUnits: candidate.capacityUnits ?? 1,
    bufferBeforeMinutes: candidate.bufferBeforeMinutes ?? 0,
    bufferAfterMinutes: candidate.bufferAfterMinutes ?? 0
  };
}

async function commitExistingHeldReservation(input: {
  tx: AppointmentLifecycleTransactionClient;
  candidate: Parameters<AppointmentLifecycleTransaction["commitReservations"]>[0]["candidates"][number];
}) {
  const sourceReservationId = input.candidate.sourceReservationId?.trim();

  if (!sourceReservationId) {
    return null;
  }

  const update = await input.tx.appointmentResourceReservation.updateMany({
    where: {
      id: {
        in: [sourceReservationId]
      },
      status: {
        in: ["HELD"]
      }
    },
    data: {
      status: "COMMITTED"
    }
  });

  if (update.count !== 1) {
    throw new Error("Held resource reservation could not be committed.");
  }

  const reservation = await input.tx.appointmentResourceReservation.findUnique({
    where: {
      id: sourceReservationId
    },
    select: persistedReservationSelect
  });

  if (!reservation) {
    throw new Error("Committed held resource reservation could not be reloaded.");
  }

  return reservation;
}

function toReleaseRecord(input: {
  reservation: { id: string; resourceId: string };
  effect: Parameters<AppointmentLifecycleTransaction["releaseReservations"]>[0];
}): AppointmentReservationReleaseRecord {
  return {
    id: input.reservation.id,
    resourceId: input.reservation.resourceId,
    status: "RELEASED",
    releasedAt: new Date(),
    releasedByUserId: input.effect.releasedByUserId,
    reasonCode: input.effect.reasonCode,
    reasonNotes: input.effect.reasonNotes
  };
}

function toTaskLinkData(input: {
  appointmentId: string;
  link: ReturnType<typeof normalizeAppointmentTaskLink>;
}) {
  return {
    appointmentId: input.appointmentId,
    taskId: input.link.taskId,
    linkType: input.link.linkType,
    linkCode: input.link.linkCode,
    title: input.link.title,
    ...(input.link.explanation ? { explanation: input.link.explanation } : {}),
    isRequired: input.link.isRequired,
    blocksAppointment: input.link.blocksAppointment,
    blocksTask: input.link.blocksTask,
    ...(input.link.automationRuleCode ? { automationRuleCode: input.link.automationRuleCode } : {}),
    ...(input.link.templateVersion ? { templateVersion: input.link.templateVersion } : {}),
    ...(input.link.createdByUserId ? { createdByUserId: input.link.createdByUserId } : {})
  };
}

function toHistoryData(input: ReturnType<typeof normalizeAppointmentHistoryEvent>) {
  return {
    appointmentId: input.appointmentId,
    actorType: input.actorType,
    ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
    ...(input.taskId ? { taskId: input.taskId } : {}),
    ...(input.appointmentTaskLinkId
      ? { appointmentTaskLinkId: input.appointmentTaskLinkId }
      : {}),
    eventType: input.eventType,
    message: input.message,
    ...(input.reasonCode ? { reasonCode: input.reasonCode } : {}),
    ...(input.reasonNotes ? { reasonNotes: input.reasonNotes } : {}),
    correlationId: input.correlationId,
    ...(input.causationId ? { causationId: input.causationId } : {}),
    ...(input.automationRuleCode ? { automationRuleCode: input.automationRuleCode } : {}),
    ...(input.automationRuleVersion ? { automationRuleVersion: input.automationRuleVersion } : {}),
    priorValue: optionalJson(input.priorValue),
    newValue: optionalJson(input.newValue),
    metadata: asInputJson(input.metadata),
    ...(input.notificationIntent ? { notificationIntent: asInputJson(input.notificationIntent) } : {}),
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {})
  };
}

function createTransactionAdapter(tx: AppointmentLifecycleTransactionClient): AppointmentLifecycleTransaction {
  return {
    createAppointment(effect) {
      return createAppointment({ tx, effect });
    },

    updateAppointment(effect) {
      return updateAppointment({ tx, effect });
    },

    async commitReservations(effect) {
      const reservations: AppointmentCommittedResourceReservation[] = [];

      for (const candidate of effect.candidates) {
        const existingReservation = await commitExistingHeldReservation({ tx, candidate });

        if (existingReservation) {
          reservations.push(existingReservation);
          continue;
        }

        reservations.push(
          await tx.appointmentResourceReservation.create({
            data: toReservationData(candidate),
            select: persistedReservationSelect
          })
        );
      }

      return reservations;
    },

    async releaseReservations(effect) {
      const reservationIds = effect.reservations.map((reservation) => reservation.id);

      if (reservationIds.length === 0) {
        return [];
      }

      const releasableReservations = await tx.appointmentResourceReservation.findMany({
        where: {
          id: {
            in: reservationIds
          },
          status: {
            in: ["HELD", "COMMITTED"]
          }
        },
        select: releaseReservationSelect
      });

      if (releasableReservations.length === 0) {
        return [];
      }

      await tx.appointmentResourceReservation.updateMany({
        where: {
          id: {
            in: releasableReservations.map((reservation) => reservation.id)
          },
          status: {
            in: ["HELD", "COMMITTED"]
          }
        },
        data: {
          status: "RELEASED"
        }
      });

      return releasableReservations.map((reservation) => toReleaseRecord({ reservation, effect }));
    },

    async createTaskLinks(input) {
      const links: AppointmentLifecyclePersistedTaskLink[] = [];

      for (const link of input.links) {
        links.push(
          await tx.appointmentTaskLink.create({
            data: toTaskLinkData({
              appointmentId: input.appointmentId,
              link
            }),
            select: persistedTaskLinkSelect
          })
        );
      }

      return links;
    },

    async removeTaskLinks(input) {
      if (input.links.length === 0) {
        return [];
      }

      const existingLinks = await tx.appointmentTaskLink.findMany({
        where: {
          appointmentId: input.appointmentId,
          OR: input.links.map((link) => ({
            taskId: link.taskId,
            linkCode: link.linkCode
          }))
        },
        select: persistedTaskLinkSelect
      });

      if (existingLinks.length === 0) {
        return [];
      }

      await tx.appointmentTaskLink.deleteMany({
        where: {
          id: {
            in: existingLinks.map((link) => link.id)
          }
        }
      });

      return existingLinks;
    },

    async createHistoryEvents(input) {
      const events: AppointmentLifecyclePersistedHistoryEvent[] = [];

      for (const event of input.events) {
        events.push(
          await tx.appointmentHistoryEvent.create({
            data: toHistoryData(event),
            select: persistedHistoryEventSelect
          })
        );
      }

      return events;
    },

    async completeCommand(completion) {
      const completed = await tx.appointmentCommandLedger.update({
        where: {
          id: completion.commandId
        },
        data: {
          status: completion.status,
          ...(completion.appointmentId ? { appointmentId: completion.appointmentId } : {}),
          completedAt: completion.completedAt,
          failedAt: completion.failedAt,
          resultSnapshot: asInputJson(completion.resultSnapshot),
          errorCode: completion.errorCode,
          errorMessage: completion.errorMessage
        },
        select: commandCompletionSelect
      });

      return {
        commandId: completed.id,
        status: completed.status,
        appointmentId: completed.appointmentId,
        completedAt: completed.completedAt,
        failedAt: completed.failedAt,
        resultSnapshot: completed.resultSnapshot as Record<string, unknown>,
        errorCode: completed.errorCode,
        errorMessage: completed.errorMessage
      };
    }
  };
}

export function createAppointmentLifecycleTransactionRepository(
  database: AppointmentLifecycleDatabase = prisma
): AppointmentLifecycleTransactionRepository {
  return {
    withLifecycleTransaction(operation) {
      return database.$transaction((tx) =>
        operation(createTransactionAdapter(tx as unknown as AppointmentLifecycleTransactionClient))
      );
    }
  };
}
