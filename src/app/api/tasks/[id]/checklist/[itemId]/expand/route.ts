import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { expandTaskSubtaskToTask } from "@/server/services/task-checklist";

type TaskChecklistItemExpandRouteContext = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

function getTaskSubtaskExpandErrorStatus(message: string) {
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
    message === "Only subtasks can be expanded into task tickets."
  ) {
    return 400;
  }

  return 500;
}

export async function POST(_request: Request, context: TaskChecklistItemExpandRouteContext) {
  const user = await getCurrentUser();
  const { id, itemId } = await context.params;

  try {
    const task = await expandTaskSubtaskToTask(user, id, itemId);
    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to expand this subtask right now.";
    return NextResponse.json({ error: message }, { status: getTaskSubtaskExpandErrorStatus(message) });
  }
}
