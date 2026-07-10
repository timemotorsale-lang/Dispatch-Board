import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createTaskSavedView, listTaskSavedViews } from "@/server/services/task-saved-views";

function getTaskSavedViewErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Saved view config must be an object." ||
    message === "Saved view name is required." ||
    message === "Saved view payload must be an object." ||
    message === "Saved view name must be 80 characters or fewer."
  ) {
    return 400;
  }

  return 500;
}

export async function GET() {
  const user = await getCurrentUser();

  try {
    const savedViews = await listTaskSavedViews(user);

    return NextResponse.json({ savedViews });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load saved views right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskSavedViewErrorStatus(message)
      }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  try {
    const savedView = await createTaskSavedView(user, payload);

    return NextResponse.json(
      {
        savedView
      },
      {
        status: 201
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save this view right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskSavedViewErrorStatus(message)
      }
    );
  }
}
