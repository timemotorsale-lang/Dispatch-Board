import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createTaskChecklistItem, listTaskChecklistItems } from "@/server/services/task-checklist";

type TaskChecklistRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskChecklistErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Task not found.") {
    return 404;
  }

  if (
    message === "You do not have permission to update this task checklist." ||
    message === "Board access required."
  ) {
    return 403;
  }

  if (
    message === "Task id is required." ||
    message === "Task checklist payload must be an object." ||
    message === "Task checklist items require a valid kind." ||
    message === "Task checklist items require label to be a string." ||
    message === "Task checklist items require a label." ||
    message.startsWith("Task checklist items must be ") ||
    message.startsWith("Task checklist items contain")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(_request: Request, context: TaskChecklistRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const items = await listTaskChecklistItems(user, id);

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the task checklist right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskChecklistErrorStatus(message)
      }
    );
  }
}

export async function POST(request: Request, context: TaskChecklistRouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const item = await createTaskChecklistItem(user, id, payload);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save the task checklist item right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskChecklistErrorStatus(message)
      }
    );
  }
}
