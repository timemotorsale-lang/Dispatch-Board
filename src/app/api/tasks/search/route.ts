import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { searchTasks } from "@/server/services/task-search";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  return 500;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return NextResponse.json({
      results: await searchTasks(await getCurrentUser(), {
        limit: url.searchParams.get("limit"),
        query: url.searchParams.get("query")
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task search is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
