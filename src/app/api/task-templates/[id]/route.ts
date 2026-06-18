import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateTaskTemplate } from "@/server/services/task-template-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskTemplateErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (message === "Task template not found.") {
    return 404;
  }

  if (
    message === "Task template id is required." ||
    message === "Task template payload must be an object." ||
    message === "Task template updates require at least one field." ||
    message.startsWith("Task template roleId") ||
    message.startsWith("Task template dutyId") ||
    message.startsWith("Task template contains") ||
    message.startsWith("Task templates require")
  ) {
    return 400;
  }

  return 500;
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const template = await updateTaskTemplate(user, id, payload);

    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update task template right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskTemplateErrorStatus(message)
      }
    );
  }
}
