import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createManualTask } from "@/server/services/task-create-service";

function getTaskCreateErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Assigned user not found." ||
    message === "Assigned user must be active." ||
    message === "Blocked tasks require a blocker reason." ||
    message === "Task creation payload must be an object." ||
    message.startsWith("Board date ") ||
    message.startsWith("Task creation contains") ||
    message.startsWith("Task creation requires")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  try {
    const task = await createManualTask(user, payload);

    return NextResponse.json(
      {
        task
      },
      {
        status: 201
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the task right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskCreateErrorStatus(message)
      }
    );
  }
}
