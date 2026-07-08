import type {
  AppointmentLifecycleAppointmentCreateEffect,
  AppointmentLifecycleAppointmentUpdateEffect,
  AppointmentLifecycleCommandExecutionPlan,
  AppointmentLifecycleHistoryEffect,
  AppointmentLifecycleReservationEffect,
  AppointmentLifecycleTaskCreateEffect,
  AppointmentLifecycleTaskLinkEffect
} from "@/server/appointments/appointment-lifecycle-command-service";
import type {
  AppointmentCommittedResourceReservation,
  AppointmentReservationReleaseRecord
} from "@/server/appointments/appointment-reservation-commit-service";
import type { AppointmentCommandStatus } from "@/server/appointments/appointment-domain";
import { normalizeAppointmentHistoryEvent } from "@/server/validation/appointment-history-events";
import { normalizeAppointmentTaskLink } from "@/server/validation/appointment-task-links";

export type AppointmentLifecyclePersistedAppointment = {
  id: string;
  appointmentNumber: string;
  version: number;
};

export type AppointmentLifecyclePersistedTaskLink = {
  id: string;
  appointmentId: string;
  taskId: string;
  linkCode: string;
};

export type AppointmentLifecyclePersistedTask = {
  id: string;
  title: string;
  boardDayId: string;
};

export type AppointmentLifecyclePersistedHistoryEvent = {
  id: string;
  appointmentId: string;
  eventType: string;
};

export type AppointmentLifecycleActivityEventCreate = {
  boardDayId: string;
  actorUserId: string | null;
  taskId: string;
  eventType: string;
  message: string;
  metadata: Record<string, unknown>;
};

export type AppointmentLifecycleCommandLedgerCompletion = {
  commandId: string;
  status: AppointmentCommandStatus;
  appointmentId: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
  resultSnapshot: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
};

export type AppointmentLifecycleTransaction = {
  createAppointment(
    effect: AppointmentLifecycleAppointmentCreateEffect
  ): Promise<AppointmentLifecyclePersistedAppointment>;
  updateAppointment(
    effect: AppointmentLifecycleAppointmentUpdateEffect
  ): Promise<AppointmentLifecyclePersistedAppointment>;
  commitReservations(
    effect: Extract<AppointmentLifecycleReservationEffect, { action: "COMMIT_RESERVATIONS" }>
  ): Promise<AppointmentCommittedResourceReservation[]>;
  releaseReservations(
    effect: Extract<AppointmentLifecycleReservationEffect, { action: "RELEASE_RESERVATIONS" }>
  ): Promise<AppointmentReservationReleaseRecord[]>;
  createTasks(
    effects: AppointmentLifecycleTaskCreateEffect[]
  ): Promise<AppointmentLifecyclePersistedTask[]>;
  createTaskLinks(input: {
    appointmentId: string;
    links: ReturnType<typeof normalizeAppointmentTaskLink>[];
  }): Promise<AppointmentLifecyclePersistedTaskLink[]>;
  removeTaskLinks(input: {
    appointmentId: string;
    links: AppointmentLifecycleTaskLinkEffect[];
  }): Promise<AppointmentLifecyclePersistedTaskLink[]>;
  createHistoryEvents(input: {
    appointmentId: string;
    events: ReturnType<typeof normalizeAppointmentHistoryEvent>[];
  }): Promise<AppointmentLifecyclePersistedHistoryEvent[]>;
  createActivityEvents(input: {
    events: AppointmentLifecycleActivityEventCreate[];
  }): Promise<void>;
  completeCommand(
    completion: AppointmentLifecycleCommandLedgerCompletion
  ): Promise<AppointmentLifecycleCommandLedgerCompletion>;
};

export type AppointmentLifecycleTransactionRepository = {
  withLifecycleTransaction<T>(
    operation: (transaction: AppointmentLifecycleTransaction) => Promise<T>
  ): Promise<T>;
};

export type AppointmentLifecycleTransactionResult = {
  executed: boolean;
  commandId: string;
  commandStatus: AppointmentCommandStatus;
  appointment: AppointmentLifecyclePersistedAppointment | null;
  createdAppointmentCount: number;
  committedReservationCount: number;
  releasedReservationCount: number;
  createdTaskCount: number;
  createdTaskLinkCount: number;
  removedTaskLinkCount: number;
  historyEventCount: number;
  resultSnapshot: Record<string, unknown>;
};

function getPlanAppointmentId(plan: AppointmentLifecycleCommandExecutionPlan) {
  if (plan.appointmentEffect?.operation === "UPDATE") {
    return plan.appointmentEffect.appointmentId;
  }

  const appointmentId = plan.commandResultSnapshot.appointmentId;

  return typeof appointmentId === "string" && appointmentId.trim() ? appointmentId : null;
}

function getHistoryActorUserId(plan: AppointmentLifecycleCommandExecutionPlan) {
  return plan.historyEffects.find((effect) => effect.actorUserId)?.actorUserId ?? null;
}

function toTaskLinkInput(input: {
  appointmentId: string;
  effect: AppointmentLifecycleTaskLinkEffect;
  actorUserId: string | null;
}) {
  return normalizeAppointmentTaskLink({
    appointmentId: input.appointmentId,
    taskId: input.effect.taskId,
    linkType: input.effect.linkType,
    linkCode: input.effect.linkCode,
    title: input.effect.title ?? `${input.effect.linkType} appointment task link`,
    explanation: input.effect.explanation ?? null,
    isRequired: input.effect.isRequired ?? input.effect.blocksAppointment,
    blocksAppointment: input.effect.blocksAppointment,
    blocksTask: input.effect.appointmentRequiredForTask,
    createdByUserId: input.actorUserId
  });
}

function toTaskLinkInputForCreatedTask(input: {
  appointmentId: string;
  effect: AppointmentLifecycleTaskCreateEffect;
  taskId: string;
}) {
  return normalizeAppointmentTaskLink({
    appointmentId: input.appointmentId,
    taskId: input.taskId,
    linkType: input.effect.linkType,
    linkCode: input.effect.linkCode,
    title: input.effect.linkTitle,
    explanation: input.effect.linkExplanation,
    isRequired: false,
    blocksAppointment: input.effect.blocksAppointment,
    blocksTask: input.effect.blocksTask,
    automationRuleCode: input.effect.automationRuleCode,
    templateVersion: input.effect.templateVersion,
    createdByUserId: input.effect.createdByUserId
  });
}

function toHistoryEventInput(input: {
  appointmentId: string;
  commandId: string;
  commandType: string;
  effect: AppointmentLifecycleHistoryEffect;
}) {
  return normalizeAppointmentHistoryEvent({
    appointmentId: input.appointmentId,
    actorType: input.effect.actorType,
    actorUserId: input.effect.actorUserId,
    eventType: input.effect.eventType,
    message: input.effect.message,
    reasonCode: input.effect.reasonCode,
    reasonNotes: input.effect.reasonNotes,
    correlationId: input.effect.correlationId,
    causationId: input.effect.causationId,
    priorValue: input.effect.priorValue,
    newValue: input.effect.newValue,
    metadata: {
      commandId: input.commandId,
      commandType: input.commandType
    },
    occurredAt: input.effect.occurredAt
  });
}

function createResultSnapshot(input: {
  plan: AppointmentLifecycleCommandExecutionPlan;
  appointmentId: string | null;
  createdAppointmentCount: number;
  committedReservationCount: number;
  releasedReservationCount: number;
  createdTaskCount: number;
  createdTaskLinkCount: number;
  removedTaskLinkCount: number;
  historyEventCount: number;
}) {
  return {
    ...input.plan.commandResultSnapshot,
    appointmentId: input.appointmentId,
    createdAppointmentCount: input.createdAppointmentCount,
    committedReservationCount: input.committedReservationCount,
    releasedReservationCount: input.releasedReservationCount,
    createdTaskCount: input.createdTaskCount,
    createdTaskLinkCount: input.createdTaskLinkCount,
    removedTaskLinkCount: input.removedTaskLinkCount,
    historyEventCount: input.historyEventCount
  };
}

function getGeneratedTaskActivityType(effect: AppointmentLifecycleTaskCreateEffect) {
  return effect.linkType === "FOLLOW_UP"
    ? "task.appointment_follow_up_created"
    : "task.appointment_linked_created";
}

function getGeneratedTaskActivityMessage(input: {
  appointment: AppointmentLifecyclePersistedAppointment | null;
  effect: AppointmentLifecycleTaskCreateEffect;
}) {
  const appointmentLabel = input.appointment?.appointmentNumber ?? "appointment";

  if (input.effect.linkType === "FOLLOW_UP") {
    return `Appointment ${appointmentLabel} generated follow-up task ${input.effect.title}.`;
  }

  return `Appointment ${appointmentLabel} generated linked task ${input.effect.title}.`;
}

function buildGeneratedTaskActivityEvents(input: {
  appointment: AppointmentLifecyclePersistedAppointment | null;
  createdTasks: AppointmentLifecyclePersistedTask[];
  taskCreateEffects: AppointmentLifecycleTaskCreateEffect[];
}): AppointmentLifecycleActivityEventCreate[] {
  return input.createdTasks.map((task, index) => {
    const effect = input.taskCreateEffects[index];

    return {
      boardDayId: task.boardDayId,
      actorUserId: effect.createdByUserId,
      taskId: task.id,
      eventType: getGeneratedTaskActivityType(effect),
      message: getGeneratedTaskActivityMessage({
        appointment: input.appointment,
        effect
      }),
      metadata: {
        appointmentId: input.appointment?.id ?? null,
        appointmentNumber: input.appointment?.appointmentNumber ?? null,
        automationRuleCode: effect.automationRuleCode,
        templateVersion: effect.templateVersion,
        linkCode: effect.linkCode,
        linkType: effect.linkType,
        generatedTaskTitle: effect.title
      }
    };
  });
}

async function recordRejectedPlan(input: {
  plan: AppointmentLifecycleCommandExecutionPlan;
  repository: AppointmentLifecycleTransactionRepository;
  now: Date;
}): Promise<AppointmentLifecycleTransactionResult> {
  const appointmentId = getPlanAppointmentId(input.plan);
  const errorMessage = input.plan.rejectionReasons.join(" ");
  const completion: AppointmentLifecycleCommandLedgerCompletion = {
    commandId: input.plan.commandId,
    status: "FAILED_TERMINAL",
    appointmentId,
    completedAt: null,
    failedAt: input.now,
    resultSnapshot: input.plan.commandResultSnapshot,
    errorCode: input.plan.rejectionCode,
    errorMessage: errorMessage || input.plan.rejectionCode
  };

  await input.repository.withLifecycleTransaction((transaction) =>
    transaction.completeCommand(completion)
  );

  return {
    executed: false,
    commandId: input.plan.commandId,
    commandStatus: "FAILED_TERMINAL",
    appointment: null,
    createdAppointmentCount: 0,
    committedReservationCount: 0,
    releasedReservationCount: 0,
    createdTaskCount: 0,
    createdTaskLinkCount: 0,
    removedTaskLinkCount: 0,
    historyEventCount: 0,
    resultSnapshot: input.plan.commandResultSnapshot
  };
}

export async function executeAppointmentLifecycleCommandPlan(input: {
  plan: AppointmentLifecycleCommandExecutionPlan;
  repository: AppointmentLifecycleTransactionRepository;
  now?: Date;
}): Promise<AppointmentLifecycleTransactionResult> {
  const now = input.now ?? new Date();

  if (!input.plan.executable) {
    return recordRejectedPlan({
      plan: input.plan,
      repository: input.repository,
      now
    });
  }

  return input.repository.withLifecycleTransaction(async (transaction) => {
    let appointment: AppointmentLifecyclePersistedAppointment | null = null;

    if (input.plan.appointmentEffect?.operation === "CREATE") {
      appointment = await transaction.createAppointment(input.plan.appointmentEffect);
    } else if (input.plan.appointmentEffect?.operation === "UPDATE") {
      appointment = await transaction.updateAppointment(input.plan.appointmentEffect);
    }

    const appointmentId = appointment?.id ?? getPlanAppointmentId(input.plan);

    if (!appointmentId) {
      throw new Error("Lifecycle command execution requires an appointment id.");
    }

    const createdAppointments: AppointmentLifecyclePersistedAppointment[] = [];

    for (const effect of input.plan.appointmentCreateEffects ?? []) {
      createdAppointments.push(await transaction.createAppointment(effect));
    }

    const committedReservations: AppointmentCommittedResourceReservation[] = [];
    const releasedReservations: AppointmentReservationReleaseRecord[] = [];

    for (const effect of input.plan.reservationEffects) {
      if (effect.action === "COMMIT_RESERVATIONS") {
        committedReservations.push(...(await transaction.commitReservations(effect)));
      } else {
        releasedReservations.push(...(await transaction.releaseReservations(effect)));
      }
    }

    const taskCreateEffects = input.plan.taskCreateEffects ?? [];
    const createdTasks = await transaction.createTasks(taskCreateEffects);
    await transaction.createActivityEvents({
      events: buildGeneratedTaskActivityEvents({
        appointment,
        createdTasks,
        taskCreateEffects
      })
    });
    const createdTaskLinks = await transaction.createTaskLinks({
      appointmentId,
      links: [
        ...input.plan.taskLinkEffects
          .filter((effect) => effect.action === "CREATE_LINK")
          .map((effect) =>
            toTaskLinkInput({
              appointmentId,
              effect,
              actorUserId: getHistoryActorUserId(input.plan)
            })
          ),
        ...createdTasks.map((task, index) =>
          toTaskLinkInputForCreatedTask({
            appointmentId,
            effect: taskCreateEffects[index],
            taskId: task.id
          })
        )
      ]
    });
    const removedTaskLinks = await transaction.removeTaskLinks({
      appointmentId,
      links: input.plan.taskLinkEffects.filter((effect) => effect.action === "REMOVE_LINK")
    });
    const historyEvents = await transaction.createHistoryEvents({
      appointmentId,
      events: input.plan.historyEffects.map((effect) =>
        toHistoryEventInput({
          appointmentId,
          commandId: input.plan.commandId,
          commandType: input.plan.commandType,
          effect
        })
      )
    });
    const resultSnapshot = createResultSnapshot({
      plan: input.plan,
      appointmentId,
      createdAppointmentCount: createdAppointments.length,
      committedReservationCount: committedReservations.length,
      releasedReservationCount: releasedReservations.length,
      createdTaskCount: createdTasks.length,
      createdTaskLinkCount: createdTaskLinks.length,
      removedTaskLinkCount: removedTaskLinks.length,
      historyEventCount: historyEvents.length
    });

    await transaction.completeCommand({
      commandId: input.plan.commandId,
      status: "SUCCEEDED",
      appointmentId,
      completedAt: now,
      failedAt: null,
      resultSnapshot,
      errorCode: null,
      errorMessage: null
    });

    return {
      executed: true,
      commandId: input.plan.commandId,
      commandStatus: "SUCCEEDED",
      appointment,
      createdAppointmentCount: createdAppointments.length,
      committedReservationCount: committedReservations.length,
      releasedReservationCount: releasedReservations.length,
      createdTaskCount: createdTasks.length,
      createdTaskLinkCount: createdTaskLinks.length,
      removedTaskLinkCount: removedTaskLinks.length,
      historyEventCount: historyEvents.length,
      resultSnapshot
    };
  });
}
