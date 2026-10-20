import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateTaskAssignment } from "@/server/services/task-assignment-service";

type TaskAssignmentRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskAssignmentErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required." || message === "Only the task owner or a manager can reassign this task.") {
    return 403;
  }

  if (message === "Task not found.") {
    return 404;
  }

  if (
    message === "Task id is required." ||
    message === "Task is already assigned to this user." ||
    message === "Assigned user not found." ||
    message === "Assigned user must be active." ||
    message === "Task assignment payload must be an object." ||
    message === "Task reassignment requires an assigned user." ||
    message === "This generated task already exists for the selected user on the same board date." ||
    message.startsWith("Task assignment contains unsupported fields")
  ) {
    return 400;
  }

  return 500;
}

async function handleTaskAssignmentUpdate(request: Request, context: TaskAssignmentRouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const task = await updateTaskAssignment(user, id, payload);

    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reassign the task right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskAssignmentErrorStatus(message)
      }
    );
  }
}

export async function POST(request: Request, context: TaskAssignmentRouteContext) {
  return handleTaskAssignmentUpdate(request, context);
}

export async function PATCH(request: Request, context: TaskAssignmentRouteContext) {
  return handleTaskAssignmentUpdate(request, context);
}
