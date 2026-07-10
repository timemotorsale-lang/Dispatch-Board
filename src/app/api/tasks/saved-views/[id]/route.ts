import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { deleteTaskSavedView } from "@/server/services/task-saved-views";

type TaskSavedViewRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskSavedViewDeleteErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (message === "Saved view id is required.") {
    return 400;
  }

  if (message.includes("Record to delete does not exist")) {
    return 404;
  }

  return 500;
}

export async function DELETE(_request: Request, context: TaskSavedViewRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    await deleteTaskSavedView(user, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete this saved view right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskSavedViewDeleteErrorStatus(message)
      }
    );
  }
}
