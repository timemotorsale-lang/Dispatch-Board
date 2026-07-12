import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { claimTask, requestTaskAssignment, startAcquiredTask } from "@/server/services/task-acquisition-service";

type Context = { params: Promise<{ id: string }> };

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to acquire this task.";
  const status = message === "Authentication required." ? 401 : message.includes("not found") ? 404 : message.includes("already") || message.includes("no longer") ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const input = await request.json().catch(() => null) as Record<string, unknown> | null;
    const actor = await getCurrentUser();
    if (input?.action === "CLAIM") return NextResponse.json({ claim: await claimTask(actor, id) });
    if (input?.action === "REQUEST") return NextResponse.json({ request: await requestTaskAssignment(actor, id, input) });
    if (input?.action === "START") return NextResponse.json({ start: await startAcquiredTask(actor, id) });
    return NextResponse.json({ error: "Select CLAIM, REQUEST, or START." }, { status: 400 });
  } catch (error) {
    return failure(error);
  }
}
