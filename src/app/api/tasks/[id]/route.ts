import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getTaskReadModelById } from "@/server/services/task-read";

type TaskReadRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskReadErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Board access required.") {
    return 403;
  }

  if (message === "Task id is required.") {
    return 400;
  }

  return 500;
}

export async function GET(_request: Request, context: TaskReadRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const task = await getTaskReadModelById(user, id);

    if (!task) {
      return NextResponse.json(
        {
          error: "Task not found."
        },
        {
          status: 404
        }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the task right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskReadErrorStatus(message)
      }
    );
  }
}
