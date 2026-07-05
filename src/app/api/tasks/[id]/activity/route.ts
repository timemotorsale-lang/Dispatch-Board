import { NextResponse } from "next/server";

import { buildTaskActivity } from "@/features/tasks/detail/task-detail-mappers";
import { getCurrentUser } from "@/server/auth/current-user";
import { listActivityFeedEventsForTask } from "@/server/services/activity-feed";
import { getTaskReadModelById } from "@/server/services/task-read";

type TaskActivityRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskActivityErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Task not found.") {
    return 404;
  }

  if (message === "Board access required.") {
    return 403;
  }

  if (message === "Task id is required.") {
    return 400;
  }

  return 500;
}

export async function GET(_request: Request, context: TaskActivityRouteContext) {
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

    const events = await listActivityFeedEventsForTask(user, id);

    return NextResponse.json({
      feedItems: buildTaskActivity(events, task)
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load task activity right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskActivityErrorStatus(message)
      }
    );
  }
}
