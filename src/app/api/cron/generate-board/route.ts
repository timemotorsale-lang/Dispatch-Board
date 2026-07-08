import { NextResponse } from "next/server";

import { triggerScheduledBoardGeneration } from "@/server/services/board-generation";
import {
  createReceivedSchedulerAttempt,
  evaluateCronRequestAuthorization,
  recordFailedSchedulerAttempt,
  recordSchedulerAttemptResult,
  recordUnauthorizedSchedulerAttempt
} from "@/server/services/scheduler-attempts";

async function handleCronGenerateBoard(request: Request) {
  let schedulerAttemptId: string | null = null;
  let authorizationOutcome: "pending" | "authorized" | "system_misconfigured" = "pending";

  try {
    const schedulerAttempt = await createReceivedSchedulerAttempt(request);

    schedulerAttemptId = schedulerAttempt.id;

    const authorizationResult = evaluateCronRequestAuthorization(request, process.env.CRON_SECRET);

    if (!authorizationResult.isAuthorized) {
      await recordUnauthorizedSchedulerAttempt(schedulerAttempt.id, authorizationResult.reasonCode);

      return NextResponse.json(
        {
          error: "Unauthorized cron request."
        },
        {
          status: 401
        }
      );
    }

    authorizationOutcome = "authorized";

    const result = await triggerScheduledBoardGeneration();

    await recordSchedulerAttemptResult(schedulerAttempt.id, result);

    return NextResponse.json(result, {
      status: result.status === "failed" ? 500 : 200
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run scheduled generation.";

    if (schedulerAttemptId) {
      await recordFailedSchedulerAttempt({
        attemptId: schedulerAttemptId,
        authorizationOutcome:
          authorizationOutcome === "pending" ? "system_misconfigured" : authorizationOutcome,
        failureCode:
          message === "CRON_SECRET is not configured."
            ? "CRON_SECRET_MISSING"
            : "SCHEDULED_REQUEST_FAILED",
        error
      });
    }

    return NextResponse.json(
      {
        error: message
      },
      {
        status: 500
      }
    );
  }
}

export async function GET(request: Request) {
  return handleCronGenerateBoard(request);
}

export async function POST(request: Request) {
  return handleCronGenerateBoard(request);
}
