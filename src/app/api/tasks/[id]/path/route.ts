import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { initiateTaskExecutionPath } from "@/server/services/task-execution-path";

type TaskExecutionPathRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskExecutionPathErrorStatus(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Task not found.") return 404;
  if (message === "You do not have permission to update this task.") return 403;

  if (
    message === "Task id is required." ||
    message === "Task path initiation requires a valid execution path."
  ) {
    return 400;
  }

  return 500;
}

const routeWorkflowAreaAliases = new Map([
  ["ADMIN", "ADMIN"],
  ["ADVERTISING", "ADVERTISING"],
  ["COLLECTIONS", "COLLECTIONS"],
  ["GENERAL_MANAGER", "GENERAL_MANAGER"],
  ["MANAGEMENT", "GENERAL_MANAGER"],
  ["INVENTORY", "INVENTORY"],
  ["INVENTORY_PARTS", "INVENTORY"],
  ["INVENTORY__PARTS", "INVENTORY"],
  ["INVENTORY / PARTS", "INVENTORY"],
  ["MARKETING", "MARKETING"],
  ["SALES", "SALES"],
  ["SERVICE_ADVISOR", "SERVICE_ADVISOR"],
  ["SERVICE ADVISOR", "SERVICE_ADVISOR"],
  ["SERVICEADVISOR", "SERVICE_ADVISOR"],
  ["SHOP", "SHOP"],
  ["SHOP_RECON", "SHOP"],
  ["SHOP__RECON", "SHOP"],
  ["SHOP & RECON", "SHOP"],
  ["SHOPRECON", "SHOP"]
]);

function normalizePathPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const workflowArea = (payload as { workflowArea?: unknown }).workflowArea;

  if (typeof workflowArea !== "string") {
    return payload;
  }

  const trimmedWorkflowArea = workflowArea.trim();
  const normalizedWorkflowArea = trimmedWorkflowArea
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const compactWorkflowArea = trimmedWorkflowArea.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const canonicalWorkflowArea =
    routeWorkflowAreaAliases.get(trimmedWorkflowArea) ??
    routeWorkflowAreaAliases.get(trimmedWorkflowArea.toUpperCase()) ??
    routeWorkflowAreaAliases.get(normalizedWorkflowArea) ??
    routeWorkflowAreaAliases.get(compactWorkflowArea);

  if (!canonicalWorkflowArea) {
    return payload;
  }

  return {
    ...payload,
    workflowArea: canonicalWorkflowArea
  };
}

function getTaskExecutionPathErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to initiate the task path right now.";

  if (message.includes("Invalid `prisma.") || message.includes("ConnectorError")) {
    return "Unable to activate this path because the task workflow data is not in sync yet. Refresh the page and try again.";
  }

  return message;
}

export async function POST(request: Request, context: TaskExecutionPathRouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const task = await initiateTaskExecutionPath(user, id, normalizePathPayload(payload));

    return NextResponse.json({ task });
  } catch (error) {
    const message = getTaskExecutionPathErrorMessage(error);

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskExecutionPathErrorStatus(message)
      }
    );
  }
}
