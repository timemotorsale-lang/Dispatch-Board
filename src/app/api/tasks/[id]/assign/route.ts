import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { assignTask } from "@/server/services/task-assignment-service";

type TaskAssignmentRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskAssignmentErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Task not found." || message === "Assigned user not found.") {
    return 404;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Task id is required." ||
    message === "Task assignment payload must be an object." ||
    message === "Task assignment reason must be text." ||
    message === "Task assignment user id must be text." ||
    message === "Task assignment mode must be accept_recommendation, override, or reassign." ||
    message === "Task assignment requires an assigned user." ||
    message === "Task does not have a stored recommendation to accept." ||
    message === "Task does not have a stored recommendation to override." ||
    message === "Task is not currently assigned." ||
    message === "Assigned user must be active." ||
    message === "Assigned user already has this generated template task."
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request, context: TaskAssignmentRouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const task = await assignTask(user, id, payload);

    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to assign the task right now.";

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
