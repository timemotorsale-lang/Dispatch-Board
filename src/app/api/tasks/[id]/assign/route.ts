import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { assignTask } from "@/server/services/task-assignment-service";

type Context = { params: Promise<{ id: string }> };

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "You do not have permission to assign tasks.") return 403;
  if (message === "Task not found.") return 404;
  if (message.includes("active user")) return 422;
  if (message.startsWith("Task assignment") || message.startsWith("Accepting") || message.startsWith("Override") || message.startsWith("Reassignment") || message.startsWith("This task") || message === "Task id is required.") return 400;
  return 500;
}

export async function POST(request: Request, context: Context) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;
  try {
    return NextResponse.json({ task: await assignTask(user, id, payload) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to assign the task right now.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
