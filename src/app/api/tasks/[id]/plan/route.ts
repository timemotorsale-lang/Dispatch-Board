import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { reviewTaskExecutionPlan } from "@/server/services/task-plan-review";

type TaskPlanRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskPlanErrorStatus(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Task not found.") return 404;
  if (message === "You do not have permission to update this task plan.") return 403;
  if (
    message === "Task id is required." ||
    message === "Task plan review payload must be an object." ||
    message === "Task plan review action is not supported."
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request, context: TaskPlanRouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const plan = await reviewTaskExecutionPlan(user, id, payload);
    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the task plan right now.";
    return NextResponse.json({ error: message }, { status: getTaskPlanErrorStatus(message) });
  }
}
