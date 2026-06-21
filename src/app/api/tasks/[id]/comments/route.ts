import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createTaskComment, listTaskComments } from "@/server/services/task-comments";

type TaskCommentsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskCommentsErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Task not found.") {
    return 404;
  }

  if (
    message === "You do not have permission to comment on this task." ||
    message === "Board access required."
  ) {
    return 403;
  }

  if (
    message === "Task id is required." ||
    message === "Task comment payload must be an object." ||
    message === "Task comments require body to be a string." ||
    message === "Task comments require a comment body." ||
    message.startsWith("Task comments contain") ||
    message.startsWith("Task comments must be ")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(_request: Request, context: TaskCommentsRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const comments = await listTaskComments(user, id);

    return NextResponse.json({ comments });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load task comments right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskCommentsErrorStatus(message)
      }
    );
  }
}

export async function POST(request: Request, context: TaskCommentsRouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const comment = await createTaskComment(user, id, payload);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save the task comment right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskCommentsErrorStatus(message)
      }
    );
  }
}
