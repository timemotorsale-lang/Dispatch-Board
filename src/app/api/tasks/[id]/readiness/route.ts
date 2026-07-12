import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { acceptTask, getTaskCompletionReadiness, overrideTaskCompletion } from "@/server/services/task-execution-readiness";

type Context = { params: Promise<{ id: string }> };

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to evaluate task readiness.";
  const status = message === "Authentication required." ? 401 : message === "Task not found." ? 404 : message.includes("permission") ? 403 : message.includes("not enabled") ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ readiness: await getTaskCompletionReadiness(await getCurrentUser(), id) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ readiness: await acceptTask(await getCurrentUser(), id) });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ readiness: await overrideTaskCompletion(await getCurrentUser(), id, await request.json().catch(() => null)) });
  } catch (error) {
    return failure(error);
  }
}
