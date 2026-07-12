import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { cancelTaskAssignmentRequest, decideTaskAssignmentRequest } from "@/server/services/task-acquisition-service";

type Context = { params: Promise<{ requestId: string }> };

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to update this assignment request.";
  const status = message === "Authentication required." ? 401 : message === "Manager access required." ? 403 : message.includes("no longer") ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { requestId } = await context.params;
    const input = await request.json().catch(() => null) as Record<string, unknown> | null;
    const actor = await getCurrentUser();
    if (input?.action === "CANCEL") return NextResponse.json({ request: await cancelTaskAssignmentRequest(actor, requestId) });
    if (input?.action === "DECIDE") return NextResponse.json({ request: await decideTaskAssignmentRequest(actor, requestId, input) });
    return NextResponse.json({ error: "Select CANCEL or DECIDE." }, { status: 400 });
  } catch (error) {
    return failure(error);
  }
}
