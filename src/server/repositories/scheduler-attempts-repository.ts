import {
  GenerationTriggerType,
  PrismaClient,
  type SchedulerAttempt,
  type SchedulerAttemptState,
  type SchedulerAuthorizationOutcome,
  type SchedulerTriggerSource
} from "@prisma/client";

import { prisma } from "@/server/db/client";

type SchedulerAttemptsDatabase = Pick<PrismaClient, "schedulerAttempt">;

export type SchedulerAttemptRecord = SchedulerAttempt;

export type CreateSchedulerAttemptInput = {
  boardDate: string;
  triggerSource: SchedulerTriggerSource;
  routePath: string;
  requestMethod: string;
  receivedAt: Date;
  managerMessage: string;
};

export type UpdateSchedulerAttemptInput = {
  id: string;
  attemptState: SchedulerAttemptState;
  authorizationOutcome: SchedulerAuthorizationOutcome;
  managerMessage: string;
  startedAt?: Date | null;
  completedAt?: Date | null;
  generationRunId?: string | null;
  unauthorizedReasonCode?: string | null;
  failureCode?: string | null;
  safeErrorMessage?: string | null;
};

export type SchedulerAttemptsRepository = {
  createSchedulerAttempt(input: CreateSchedulerAttemptInput): Promise<SchedulerAttemptRecord>;
  updateSchedulerAttempt(input: UpdateSchedulerAttemptInput): Promise<SchedulerAttemptRecord>;
  listSchedulerAttemptsForDate(boardDate: string): Promise<SchedulerAttemptRecord[]>;
};

function toBoardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

export function createSchedulerAttemptsRepository(
  database: SchedulerAttemptsDatabase = prisma
): SchedulerAttemptsRepository {
  return {
    async createSchedulerAttempt(input) {
      return database.schedulerAttempt.create({
        data: {
          boardDate: toBoardDateValue(input.boardDate),
          triggerType: GenerationTriggerType.SCHEDULED,
          triggerSource: input.triggerSource,
          routePath: input.routePath,
          requestMethod: input.requestMethod,
          receivedAt: input.receivedAt,
          managerMessage: input.managerMessage
        }
      });
    },

    async updateSchedulerAttempt(input) {
      return database.schedulerAttempt.update({
        where: {
          id: input.id
        },
        data: {
          attemptState: input.attemptState,
          authorizationOutcome: input.authorizationOutcome,
          managerMessage: input.managerMessage,
          ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
          ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
          ...(input.generationRunId !== undefined ? { generationRunId: input.generationRunId } : {}),
          ...(input.unauthorizedReasonCode !== undefined
            ? { unauthorizedReasonCode: input.unauthorizedReasonCode }
            : {}),
          ...(input.failureCode !== undefined ? { failureCode: input.failureCode } : {}),
          ...(input.safeErrorMessage !== undefined ? { safeErrorMessage: input.safeErrorMessage } : {})
        }
      });
    },

    async listSchedulerAttemptsForDate(boardDate) {
      return database.schedulerAttempt.findMany({
        where: {
          boardDate: toBoardDateValue(boardDate)
        },
        orderBy: [{ receivedAt: "desc" }, { id: "desc" }]
      });
    }
  };
}
