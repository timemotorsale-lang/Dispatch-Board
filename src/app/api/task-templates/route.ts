import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  createTaskTemplate,
  listTaskTemplatesForManager
} from "@/server/services/task-template-service";

function getTaskTemplateErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Task template not found." ||
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

function shouldIncludeInactiveTemplates(request: Request) {
  const includeInactive = new URL(request.url).searchParams.get("includeInactive")?.trim().toLowerCase();

  return includeInactive === "true" || includeInactive === "1";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  try {
    const templates = await listTaskTemplatesForManager(user, {
      includeInactive: shouldIncludeInactiveTemplates(request)
    });

    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load task templates right now.";

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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  try {
    const template = await createTaskTemplate(user, payload);

    return NextResponse.json(
      {
        template
      },
      {
        status: 201
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create task template right now.";

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
