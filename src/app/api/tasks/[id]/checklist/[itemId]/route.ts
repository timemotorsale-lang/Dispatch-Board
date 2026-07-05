import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateTaskChecklistItem } from "@/server/services/task-checklist";

type TaskChecklistItemRouteContext = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

function getTaskChecklistItemErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Task not found." || message === "Task checklist item not found.") {
    return 404;
  }

  if (message === "You do not have permission to update this task checklist.") {
    return 403;
  }

  if (
    message === "Task id is required." ||
    message === "Task checklist item id is required." ||
    message === "Task checklist update payload must be an object." ||
    message === "Task checklist updates require completed to be a boolean." ||
    message.startsWith("Task checklist updates contain")
  ) {
    return 400;
  }

  return 500;
}

async function handleTaskChecklistItemUpdate(
  request: Request,
  context: TaskChecklistItemRouteContext
) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id, itemId } = await context.params;

  try {
    const item = await updateTaskChecklistItem(user, id, itemId, payload);

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update the task checklist item right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskChecklistItemErrorStatus(message)
      }
    );
  }
}

export async function PATCH(request: Request, context: TaskChecklistItemRouteContext) {
  return handleTaskChecklistItemUpdate(request, context);
}

export async function POST(request: Request, context: TaskChecklistItemRouteContext) {
  return handleTaskChecklistItemUpdate(request, context);
}
