import { describe, expect, it } from "vitest";

import { createAppointmentLifecycleTransactionRepository } from "@/server/repositories/appointment-lifecycle-transaction-repository";

function createDatabaseHarness() {
  const appointmentCreates: Record<string, unknown>[] = [];
  const appointmentUpdates: Array<{
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }> = [];
  const reservationCreates: Record<string, unknown>[] = [];
  const boardDayUpserts: Array<{
    where: Record<string, unknown>;
    create: Record<string, unknown>;
  }> = [];
  const taskCreates: Record<string, unknown>[] = [];
  const taskLinkCreates: Record<string, unknown>[] = [];
  const historyCreates: Record<string, unknown>[] = [];
  const commandUpdates: Array<{
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }> = [];
  const deletedTaskLinkIds: string[][] = [];
  const updatedReservationIds: string[][] = [];
  const committedHeldReservationIds: string[] = [];

  const tx = {
    appointment: {
      async create(input: { data: Record<string, unknown> }) {
        appointmentCreates.push(input.data);

        return {
          id: "appointment-created",
          appointmentNumber: input.data.appointmentNumber as string,
          version: input.data.version as number
        };
      },

      async updateMany(input: { where: Record<string, unknown>; data: Record<string, unknown> }) {
        appointmentUpdates.push({
          where: input.where,
          data: input.data
        });

        return { count: input.where.version === 3 ? 1 : 0 };
      },

      async findUnique() {
        return {
          id: "appointment-1",
          appointmentNumber: "APT-10245",
          version: 4
        };
      }
    },
    appointmentResourceReservation: {
      async create(input: { data: Record<string, unknown> }) {
        reservationCreates.push(input.data);

        return {
          id: `reservation-${reservationCreates.length}`,
          appointmentId: input.data.appointmentId as string,
          requirementId: (input.data.requirementId as string | undefined) ?? null,
          resourceId: input.data.resourceId as string,
          status: input.data.status as "COMMITTED",
          startsAt: input.data.startsAt as Date,
          endsAt: input.data.endsAt as Date,
          capacityUnits: input.data.capacityUnits as number,
          bufferBeforeMinutes: input.data.bufferBeforeMinutes as number,
          bufferAfterMinutes: input.data.bufferAfterMinutes as number,
          createdAt: new Date("2026-07-06T15:00:00.000Z"),
          updatedAt: new Date("2026-07-06T15:00:00.000Z")
        };
      },

      async findUnique(input: { where: { id: string } }) {
        return {
          id: input.where.id,
          appointmentId: "appointment-1",
          requirementId: "requirement-1",
          resourceId: "resource-bay-1",
          status: "COMMITTED",
          startsAt: new Date("2026-07-06T16:00:00.000Z"),
          endsAt: new Date("2026-07-06T17:00:00.000Z"),
          capacityUnits: 1,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          createdAt: new Date("2026-07-06T15:00:00.000Z"),
          updatedAt: new Date("2026-07-06T15:00:00.000Z")
        };
      },

      async findMany() {
        return [
          {
            id: "reservation-old",
            resourceId: "resource-bay-1",
            status: "COMMITTED"
          }
        ];
      },

      async updateMany(input: { where: { id: { in: string[] } }; data?: Record<string, unknown> }) {
        if (input.data?.status === "COMMITTED") {
          committedHeldReservationIds.push(...input.where.id.in);
        }

        updatedReservationIds.push(input.where.id.in);
        return { count: input.where.id.in.length };
      }
    },
    boardDay: {
      async upsert(input: {
        where: Record<string, unknown>;
        create: Record<string, unknown>;
      }) {
        boardDayUpserts.push({
          where: input.where,
          create: input.create
        });

        return {
          id: `board-day-${boardDayUpserts.length}`,
          date: input.create.date as Date
        };
      }
    },
    task: {
      async create(input: { data: Record<string, unknown> }) {
        taskCreates.push(input.data);

        return {
          id: `task-${taskCreates.length}`,
          title: input.data.title as string,
          boardDayId: input.data.boardDayId as string
        };
      }
    },
    appointmentTaskLink: {
      async create(input: { data: Record<string, unknown> }) {
        taskLinkCreates.push(input.data);

        return {
          id: `link-${taskLinkCreates.length}`,
          appointmentId: input.data.appointmentId as string,
          taskId: input.data.taskId as string,
          linkCode: input.data.linkCode as string
        };
      },

      async findMany() {
        return [
          {
            id: "link-old",
            appointmentId: "appointment-1",
            taskId: "task-old",
            linkCode: "OLD_LINK"
          }
        ];
      },

      async deleteMany(input: { where: { id: { in: string[] } } }) {
        deletedTaskLinkIds.push(input.where.id.in);
        return { count: input.where.id.in.length };
      }
    },
    appointmentHistoryEvent: {
      async create(input: { data: Record<string, unknown> }) {
        historyCreates.push(input.data);

        return {
          id: `history-${historyCreates.length}`,
          appointmentId: input.data.appointmentId as string,
          eventType: input.data.eventType as string
        };
      }
    },
    appointmentCommandLedger: {
      async update(input: { where: Record<string, unknown>; data: Record<string, unknown> }) {
        commandUpdates.push({
          where: input.where,
          data: input.data
        });

        return {
          id: input.where.id as string,
          status: input.data.status as "SUCCEEDED",
          appointmentId: (input.data.appointmentId as string | undefined) ?? null,
          completedAt: input.data.completedAt as Date | null,
          failedAt: input.data.failedAt as Date | null,
          resultSnapshot: input.data.resultSnapshot as Record<string, unknown>,
          errorCode: (input.data.errorCode as string | undefined) ?? null,
          errorMessage: (input.data.errorMessage as string | undefined) ?? null
        };
      }
    }
  };
  const database = {
    async $transaction<T>(operation: (transaction: typeof tx) => Promise<T>) {
      return operation(tx);
    }
  };

  return {
    appointmentCreates,
    appointmentUpdates,
    boardDayUpserts,
    commandUpdates,
    database,
    deletedTaskLinkIds,
    historyCreates,
    committedHeldReservationIds,
    reservationCreates,
    taskCreates,
    taskLinkCreates,
    updatedReservationIds
  };
}

describe("appointment lifecycle Prisma transaction repository", () => {
  it("persists appointment, reservation, task-link, history, and command effects in one transaction shape", async () => {
    const harness = createDatabaseHarness();
    const repository = createAppointmentLifecycleTransactionRepository(
      harness.database as never
    );

    await repository.withLifecycleTransaction(async (tx) => {
      const appointment = await tx.updateAppointment({
        operation: "UPDATE",
        appointmentId: "appointment-1",
        expectedVersion: 3,
        set: {
          bookingStatus: "SCHEDULED",
          title: "Updated",
          customerSnapshot: {
            displayName: "Ahmed Ibrahim"
          }
        },
        incrementVersion: 1
      });
      const reservations = await tx.commitReservations({
        action: "COMMIT_RESERVATIONS",
        allowWarningCommit: false,
        candidates: [
          {
            appointmentId: "appointment-1",
            appointmentLocationId: "loc-1",
            requirementCode: "SERVICE_BAY",
            resource: {
              id: "resource-bay-1",
              name: "Bay 1",
              status: "ACTIVE",
              capacityMode: "EXCLUSIVE",
              capacity: 1,
              conflictPolicy: "HARD_BLOCK",
              effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
              effectiveTo: null
            },
            resourceLocationId: "loc-1",
            operatingWindows: [],
            unavailability: [],
            startsAt: new Date("2026-07-06T16:00:00.000Z"),
            endsAt: new Date("2026-07-06T17:00:00.000Z")
          }
        ]
      });
      const links = await tx.createTaskLinks({
        appointmentId: appointment.id,
        links: [
          {
            appointmentId: appointment.id,
            taskId: "task-1",
            linkType: "PREPARATION",
            linkCode: "PREP_TASK",
            title: "Preparation appointment task link",
            explanation: null,
            isRequired: true,
            blocksAppointment: true,
            blocksTask: false,
            automationRuleCode: null,
            templateVersion: null,
            createdByUserId: "user-manager"
          }
        ]
      });
      const tasks = await tx.createTasks([
        {
          action: "CREATE_TASK",
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
          templateVersion: 1,
          title: "Callback required for appointment APT-10245",
          description: "Call customer with estimate.",
          assignedUserId: "user-manager",
          createdByUserId: "user-manager",
          boardDate: "2026-07-07",
          dueAt: new Date("2026-07-07T15:00:00.000Z"),
          status: "NOT_STARTED",
          workflowArea: "SHOP",
          sourceType: "MANAGER",
          requiresManagerApproval: false,
          customerReference: "Ahmed Ibrahim",
          vehicleReference: "2014 Ford Taurus",
          linkType: "FOLLOW_UP",
          linkCode: "OUTCOME_CALLBACK_REQUIRED",
          linkTitle: "Outcome follow-up task",
          linkExplanation: "Created automatically from final appointment outcome disposition.",
          blocksAppointment: false,
          blocksTask: true
        }
      ]);
      const events = await tx.createHistoryEvents({
        appointmentId: appointment.id,
        events: [
          {
            appointmentId: appointment.id,
            actorType: "HUMAN",
            actorUserId: "user-manager",
            taskId: null,
            appointmentTaskLinkId: null,
            eventType: "SCHEDULED",
            message: "Appointment scheduled.",
            reasonCode: null,
            reasonNotes: null,
            correlationId: "corr-1",
            causationId: "cmd-1",
            automationRuleCode: null,
            automationRuleVersion: null,
            priorValue: null,
            newValue: null,
            metadata: {},
            notificationIntent: null,
            occurredAt: new Date("2026-07-06T15:00:00.000Z")
          }
        ]
      });
      const completion = await tx.completeCommand({
        commandId: "cmd-1",
        status: "SUCCEEDED",
        appointmentId: appointment.id,
        completedAt: new Date("2026-07-06T15:00:00.000Z"),
        failedAt: null,
        resultSnapshot: {
          appointmentId: appointment.id,
          committedReservationCount: reservations.length,
          createdTaskCount: tasks.length,
          createdTaskLinkCount: links.length,
          historyEventCount: events.length
        },
        errorCode: null,
        errorMessage: null
      });

      return completion;
    });

    expect(harness.appointmentUpdates).toEqual([
      {
        where: {
          id: "appointment-1",
          version: 3
        },
        data: expect.objectContaining({
          bookingStatus: "SCHEDULED",
          title: "Updated",
          version: {
            increment: 1
          }
        })
      }
    ]);
    expect(harness.reservationCreates).toEqual([
      expect.objectContaining({
        appointmentId: "appointment-1",
        resourceId: "resource-bay-1",
        status: "COMMITTED",
        capacityUnits: 1
      })
    ]);
    expect(harness.taskLinkCreates).toEqual([
      expect.objectContaining({
        appointmentId: "appointment-1",
        taskId: "task-1",
        linkCode: "PREP_TASK"
      })
    ]);
    expect(harness.boardDayUpserts).toEqual([
      {
        where: {
          date: new Date("2026-07-07T00:00:00.000Z")
        },
        create: {
          date: new Date("2026-07-07T00:00:00.000Z")
        }
      }
    ]);
    expect(harness.taskCreates).toEqual([
      expect.objectContaining({
        assignedUserId: "user-manager",
        boardDayId: "board-day-1",
        createdByUserId: "user-manager",
        customerReference: "Ahmed Ibrahim",
        dueAt: new Date("2026-07-07T15:00:00.000Z"),
        sourceType: "MANAGER",
        status: "NOT_STARTED",
        title: "Callback required for appointment APT-10245",
        vehicleReference: "2014 Ford Taurus",
        workflowArea: "SHOP"
      })
    ]);
    expect(harness.historyCreates).toEqual([
      expect.objectContaining({
        appointmentId: "appointment-1",
        eventType: "SCHEDULED",
        correlationId: "corr-1"
      })
    ]);
    expect(harness.commandUpdates).toEqual([
      expect.objectContaining({
        where: {
          id: "cmd-1"
        },
        data: expect.objectContaining({
          status: "SUCCEEDED",
          appointmentId: "appointment-1",
          errorCode: null
        })
      })
    ]);
  });

  it("rejects stale appointment updates before downstream effects can be written", async () => {
    const harness = createDatabaseHarness();
    const repository = createAppointmentLifecycleTransactionRepository(
      harness.database as never
    );

    await expect(
      repository.withLifecycleTransaction((tx) =>
        tx.updateAppointment({
          operation: "UPDATE",
          appointmentId: "appointment-1",
          expectedVersion: 2,
          set: {
            title: "Stale update"
          },
          incrementVersion: 1
        })
      )
    ).rejects.toThrow("expected version no longer matches");

    expect(harness.appointmentUpdates).toHaveLength(1);
    expect(harness.commandUpdates).toEqual([]);
  });

  it("releases and removes existing records by stable identifiers", async () => {
    const harness = createDatabaseHarness();
    const repository = createAppointmentLifecycleTransactionRepository(
      harness.database as never
    );

    await repository.withLifecycleTransaction(async (tx) => {
      await tx.releaseReservations({
        action: "RELEASE_RESERVATIONS",
        reservations: [
          {
            id: "reservation-old",
            resourceId: "resource-bay-1",
            status: "COMMITTED"
          }
        ],
        reasonCode: "CUSTOMER_REQUEST",
        reasonNotes: "Customer requested change.",
        releasedByUserId: "user-manager"
      });
      await tx.removeTaskLinks({
        appointmentId: "appointment-1",
        links: [
          {
            action: "REMOVE_LINK",
            taskId: "task-old",
            linkType: "PREPARATION",
            linkCode: "OLD_LINK",
            blocksAppointment: false,
            appointmentRequiredForTask: false
          }
        ]
      });
    });

    expect(harness.updatedReservationIds).toEqual([["reservation-old"]]);
    expect(harness.deletedTaskLinkIds).toEqual([["link-old"]]);
  });

  it("commits an existing held reservation without creating a duplicate row", async () => {
    const harness = createDatabaseHarness();
    const repository = createAppointmentLifecycleTransactionRepository(
      harness.database as never
    );

    await repository.withLifecycleTransaction(async (tx) => {
      const reservations = await tx.commitReservations({
        action: "COMMIT_RESERVATIONS",
        allowWarningCommit: false,
        candidates: [
          {
            sourceReservationId: "reservation-held",
            appointmentId: "appointment-1",
            appointmentLocationId: "loc-1",
            requirementId: "requirement-1",
            requirementAppointmentId: "appointment-1",
            requirementCode: "SERVICE_BAY",
            resource: {
              id: "resource-bay-1",
              name: "Bay 1",
              status: "ACTIVE",
              capacityMode: "EXCLUSIVE",
              capacity: 1,
              conflictPolicy: "HARD_BLOCK",
              effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
              effectiveTo: null
            },
            resourceLocationId: "loc-1",
            operatingWindows: [],
            unavailability: [],
            startsAt: new Date("2026-07-06T16:00:00.000Z"),
            endsAt: new Date("2026-07-06T17:00:00.000Z"),
            status: "COMMITTED"
          }
        ]
      });

      return reservations;
    });

    expect(harness.committedHeldReservationIds).toEqual(["reservation-held"]);
    expect(harness.reservationCreates).toEqual([]);
  });
});
