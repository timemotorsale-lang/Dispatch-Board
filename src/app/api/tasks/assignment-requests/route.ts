import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getPendingTaskAssignmentRequests } from "@/server/services/task-acquisition-service";

export async function GET() {
  try {
    return NextResponse.json({ requests: await getPendingTaskAssignmentRequests(await getCurrentUser()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load assignment requests.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message === "Manager access required." ? 403 : 400 });
  }
}
