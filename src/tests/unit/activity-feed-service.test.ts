import {
  BusinessDay,
  Prisma,
  TaskStatus,
  WorkflowArea,
  type AppSetting
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { ActivityFeedRepository } from "@/server/repositories/activity-feed-repository";
import { getActivityFeedForDate, getActivityFeedForToday } from "@/server/services/activity-feed";
import {
  ActivityEventType,
  type ActivityEventType as ActivityEventTypeValue
} from "@/server/services/activity-events";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function createActivityFeedRepositoryHarness(options: {
  boardDays?: Array<{
    id: string;
    date: string;
  }>;
  eventsByBoardDayId?: Record<
    string,
    Array<{
      id: string;
      eventType?: ActivityEventTypeValue;
      message: string;
      metadata?: Prisma.JsonValue;
      createdAt: string;
      actorUser?: {
        id: string;
        name: string;
        email: string;
      } | null;
      task?: {
        id: string;
        title: string;
        status?: TaskStatus;
        workflowArea?: WorkflowArea;
      } | null;
    }>
  >;
  appointmentEventsByBoardDate?: Record<
    string,
    Array<{
      id: string;
      eventType: string;
      message: string;
      metadata?: Prisma.JsonValue;
      occurredAt: string;
      createdAt?: string;
      actorUser?: {
        id: string;
        name: string;
        email: string;
      } | null;
      task?: {
        id: string;
        title: string;
        status?: TaskStatus;
        workflowArea?: WorkflowArea;
      } | null;
      appointment: {
        id: string;
        appointmentNumber: string;
        title: string;
        bookingStatus: string;
      };
    }>
  >;
} = {}) {
  const listedBoardDayIds: string[] = [];
  const listedAppointmentBoardDates: string[] = [];
  const boardDays =
    options.boardDays?.map((boardDay) => ({
      id: boardDay.id,
      date: new Date(`${boardDay.date}T00:00:00.000Z`)
    })) ?? [];
  const eventsByBoardDayId = new Map(
    Object.entries(options.eventsByBoardDayId ?? {}).map(([boardDayId, events]) => [
      boardDayId,
      events.map((event) => ({
        id: event.id,
        eventType: event.eventType ?? ActivityEventType.STATUS_CHANGED,
        message: event.message,
        metadata: event.metadata ?? {},
        createdAt: new Date(event.createdAt),
        actorUser: event.actorUser ?? null,
        task: event.task
          ? {
              id: event.task.id,
              title: event.task.title,
              status: event.task.status ?? TaskStatus.IN_PROGRESS,
              workflowArea: event.task.workflowArea ?? WorkflowArea.SALES
            }
          : null
      }))
    ])
  );
  const appointmentEventsByBoardDate = new Map(
    Object.entries(options.appointmentEventsByBoardDate ?? {}).map(([boardDate, events]) => [
      boardDate,
      events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        message: event.message,
        metadata: event.metadata ?? {},
        occurredAt: new Date(event.occurredAt),
        createdAt: new Date(event.createdAt ?? event.occurredAt),
        actorUser: event.actorUser ?? null,
        task: event.task
          ? {
              id: event.task.id,
              title: event.task.title,
              status: event.task.status ?? TaskStatus.IN_PROGRESS,
              workflowArea: event.task.workflowArea ?? WorkflowArea.SALES
            }
          : null,
        appointment: event.appointment
      }))
    ])
  );

  const repository: ActivityFeedRepository = {
    async findBoardDayByDate(boardDate) {
      return (
        boardDays.find((candidate) => candidate.date.toISOString().slice(0, 10) === boardDate) ??
        null
      );
    },
    async listActivityEventsForBoardDay(boardDayId) {
      listedBoardDayIds.push(boardDayId);
      return eventsByBoardDayId.get(boardDayId) ?? [];
    },
    async listAppointmentHistoryEventsForBoardDate(boardDate) {
      listedAppointmentBoardDates.push(boardDate);
      return appointmentEventsByBoardDate.get(boardDate) ?? [];
    }
  };

  return {
    readListedBoardDayIds() {
      return [...listedBoardDayIds];
    },
    readListedAppointmentBoardDates() {
      return [...listedAppointmentBoardDates];
    },
    repository
  };
}

function createAppSettingsRepository() {
  const settings: AppSetting = {
    id: "dispatch-board-settings",
    dailyGenerationTime: "09:00",
    timezone: "America/Chicago",
    businessDays: [
      BusinessDay.MONDAY,
      BusinessDay.TUESDAY,
      BusinessDay.WEDNESDAY,
      BusinessDay.THURSDAY,
      BusinessDay.FRIDAY,
      BusinessDay.SATURDAY
    ],
    createdAt: new Date("2026-06-17T08:00:00.000Z"),
    updatedAt: new Date("2026-06-17T08:00:00.000Z")
  };

  return {
    async getOrCreateAppSettings() {
      return settings;
    },
    async updateAppSettings() {
      return settings;
    }
  };
}

describe("activity feed service", () => {
  it("returns UI-ready activity events for an authenticated staff user", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const harness = createActivityFeedRepositoryHarness({
      boardDays: [
        {
          id: "board-day-1",
          date: "2026-06-21"
        }
      ],
      eventsByBoardDayId: {
        "board-day-1": [
          {
            id: "activity-event-2",
            message: "Jordan moved Follow up with hot lead to In Progress",
            createdAt: "2026-06-21T15:00:00.000Z",
            actorUser: {
              id: "user-sales",
              name: "Baraka Sales",
              email: "jordan.sales@local.test"
            },
            task: {
              id: "task-1",
              title: "Follow up with hot lead",
              status: TaskStatus.IN_PROGRESS,
              workflowArea: WorkflowArea.SALES
            },
            metadata: {
              previousStatus: "NOT_STARTED",
              nextStatus: "IN_PROGRESS"
            }
          },
          {
            id: "activity-event-1",
            eventType: ActivityEventType.DAILY_BOARD_GENERATED,
            message: "Daily board generated",
            createdAt: "2026-06-21T14:30:00.000Z"
          }
        ]
      }
    });

    const result = await getActivityFeedForDate(staffUser, "2026-06-21", {
      repository: harness.repository
    });

    expect(result).toEqual({
      date: "2026-06-21",
      boardDayId: "board-day-1",
      events: [
        {
          id: "activity-event-2",
          boardDate: "2026-06-21",
          eventType: "STATUS_CHANGED",
          message: "Jordan moved Follow up with hot lead to In Progress",
          createdAt: "2026-06-21T15:00:00.000Z",
          actor: {
            id: "user-sales",
            name: "Baraka Sales",
            email: "jordan.sales@local.test"
          },
          task: {
            id: "task-1",
            title: "Follow up with hot lead",
            status: "IN_PROGRESS",
            workflowArea: "SALES"
          },
          metadata: {
            previousStatus: "NOT_STARTED",
            nextStatus: "IN_PROGRESS"
          }
        },
        {
          id: "activity-event-1",
          boardDate: "2026-06-21",
          eventType: "DAILY_BOARD_GENERATED",
          message: "Daily board generated",
          createdAt: "2026-06-21T14:30:00.000Z",
          actor: null,
          task: null,
          metadata: {}
        }
      ]
    });
  });

  it("merges appointment history events into the board activity feed", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createActivityFeedRepositoryHarness({
      boardDays: [
        {
          id: "board-day-1",
          date: "2026-07-06"
        }
      ],
      eventsByBoardDayId: {
        "board-day-1": [
          {
            id: "activity-event-task",
            eventType: ActivityEventType.TASK_CREATED,
            message: "Task created",
            createdAt: "2026-07-06T14:30:00.000Z"
          }
        ]
      },
      appointmentEventsByBoardDate: {
        "2026-07-06": [
          {
            id: "appointment-history-scheduled",
            eventType: "SCHEDULED",
            message: "Appointment APT-10245 scheduled.",
            occurredAt: "2026-07-06T16:00:00.000Z",
            actorUser: {
              id: "user-manager",
              name: "Abdi Farah",
              email: "morgan.manager@local.test"
            },
            task: {
              id: "task-1",
              title: "Customer meeting required",
              status: TaskStatus.IN_PROGRESS,
              workflowArea: WorkflowArea.SALES
            },
            appointment: {
              id: "appointment-1",
              appointmentNumber: "APT-10245",
              title: "Customer Meeting",
              bookingStatus: "SCHEDULED"
            },
            metadata: {
              reasonCode: "UNSCHEDULED_DRAFT_SCHEDULED"
            }
          }
        ]
      }
    });

    const result = await getActivityFeedForDate(manager, "2026-07-06", {
      repository: harness.repository
    });

    expect(harness.readListedAppointmentBoardDates()).toEqual(["2026-07-06"]);
    expect(result.events).toEqual([
      {
        id: "appointment-history-appointment-history-scheduled",
        boardDate: "2026-07-06",
        eventType: "APPOINTMENT_SCHEDULED",
        message: "Appointment APT-10245 scheduled.",
        metadata: {
          reasonCode: "UNSCHEDULED_DRAFT_SCHEDULED"
        },
        createdAt: "2026-07-06T16:00:00.000Z",
        actor: {
          id: "user-manager",
          name: "Abdi Farah",
          email: "morgan.manager@local.test"
        },
        task: {
          id: "task-1",
          title: "Customer meeting required",
          status: "IN_PROGRESS",
          workflowArea: "SALES"
        },
        appointment: {
          id: "appointment-1",
          appointmentNumber: "APT-10245",
          title: "Customer Meeting",
          bookingStatus: "SCHEDULED"
        }
      },
      {
        id: "activity-event-task",
        boardDate: "2026-07-06",
        eventType: "TASK_CREATED",
        message: "Task created",
        createdAt: "2026-07-06T14:30:00.000Z",
        actor: null,
        task: null,
        metadata: {}
      }
    ]);
  });

  it("surfaces appointment automation history events in the shared activity feed", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createActivityFeedRepositoryHarness({
      boardDays: [
        {
          id: "board-day-1",
          date: "2026-07-06"
        }
      ],
      appointmentEventsByBoardDate: {
        "2026-07-06": [
          {
            id: "appointment-history-automation-failed",
            eventType: "AUTOMATION_FAILED",
            message: "Appointment APT-10245 automation APPOINTMENT_OUTCOME_FOLLOW_UP_TASK failed.",
            occurredAt: "2026-07-06T18:00:00.000Z",
            actorUser: null,
            task: {
              id: "task-generated-1",
              title: "Call customer back",
              status: TaskStatus.NOT_STARTED,
              workflowArea: WorkflowArea.SALES
            },
            appointment: {
              id: "appointment-1",
              appointmentNumber: "APT-10245",
              title: "Customer Meeting",
              bookingStatus: "COMPLETED"
            },
            metadata: {
              automationExecutionId: "execution-1",
              generatedTaskId: "task-generated-1",
              failureCode: "FOLLOW_UP_TASK_WRITE_FAILED",
              failureMessage: "Could not persist follow-up task."
            }
          }
        ]
      }
    });

    const result = await getActivityFeedForDate(manager, "2026-07-06", {
      repository: harness.repository
    });

    expect(result.events[0]).toEqual({
      id: "appointment-history-appointment-history-automation-failed",
      boardDate: "2026-07-06",
      eventType: "APPOINTMENT_AUTOMATION_FAILED",
      message: "Appointment APT-10245 automation APPOINTMENT_OUTCOME_FOLLOW_UP_TASK failed.",
      metadata: {
        automationExecutionId: "execution-1",
        generatedTaskId: "task-generated-1",
        failureCode: "FOLLOW_UP_TASK_WRITE_FAILED",
        failureMessage: "Could not persist follow-up task."
      },
      createdAt: "2026-07-06T18:00:00.000Z",
      actor: null,
      task: {
        id: "task-generated-1",
        title: "Call customer back",
        status: "NOT_STARTED",
        workflowArea: "SALES"
      },
      appointment: {
        id: "appointment-1",
        appointmentNumber: "APT-10245",
        title: "Customer Meeting",
        bookingStatus: "COMPLETED"
      }
    });
  });

  it("returns an empty feed when no board exists for the requested date", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createActivityFeedRepositoryHarness();

    const result = await getActivityFeedForDate(manager, "2026-06-22", {
      repository: harness.repository
    });

    expect(result).toEqual({
      date: "2026-06-22",
      boardDayId: null,
      events: []
    });
    expect(harness.readListedBoardDayIds()).toHaveLength(0);
  });

  it("scopes activity events to the selected board date only", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createActivityFeedRepositoryHarness({
      boardDays: [
        {
          id: "board-day-selected",
          date: "2026-06-21"
        },
        {
          id: "board-day-other",
          date: "2026-06-22"
        }
      ],
      eventsByBoardDayId: {
        "board-day-selected": [
          {
            id: "activity-event-selected",
            message: "Selected day event",
            createdAt: "2026-06-21T15:00:00.000Z"
          }
        ],
        "board-day-other": [
          {
            id: "activity-event-other",
            message: "Other day event",
            createdAt: "2026-06-22T15:00:00.000Z"
          }
        ]
      }
    });

    const result = await getActivityFeedForDate(manager, "2026-06-21", {
      repository: harness.repository
    });

    expect(harness.readListedBoardDayIds()).toEqual(["board-day-selected"]);
    expect(result.events).toEqual([
      expect.objectContaining({
        id: "activity-event-selected",
        message: "Selected day event"
      })
    ]);
  });

  it("rejects invalid feed dates before querying events", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createActivityFeedRepositoryHarness();

    await expect(
      getActivityFeedForDate(manager, "2026-02-31", {
        repository: harness.repository
      })
    ).rejects.toThrow("Board date must be a valid calendar date.");
  });

  it("rejects unauthenticated feed reads", async () => {
    const harness = createActivityFeedRepositoryHarness();

    await expect(
      getActivityFeedForDate(null, "2026-06-21", {
        repository: harness.repository
      })
    ).rejects.toThrow("Authentication required.");
  });

  it("resolves today's feed using the configured timezone", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const harness = createActivityFeedRepositoryHarness({
      boardDays: [
        {
          id: "board-day-2",
          date: "2026-06-21"
        }
      ]
    });

    const result = await getActivityFeedForToday(manager, {
      repository: harness.repository,
      appSettingsRepository: createAppSettingsRepository(),
      now: () => new Date("2026-06-22T02:30:00.000Z")
    });

    expect(result).toEqual({
      date: "2026-06-21",
      boardDayId: "board-day-2",
      events: []
    });
  });
});
