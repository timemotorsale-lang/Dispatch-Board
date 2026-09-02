import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { initiateTaskExecutionPath } from "@/server/services/task-execution-path";

type TaskExecutionPathRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskExecutionPathErrorStatus(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Task not found.") return 404;
  if (message === "You do not have permission to update this task.") return 403;

  if (
    message === "Task id is required." ||
    message === "Task path initiation requires a valid execution path."
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request, context: TaskExecutionPathRouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const task = await initiateTaskExecutionPath(user, id, payload);

    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initiate the task path right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskExecutionPathErrorStatus(message)
      }
    );
  }
}
