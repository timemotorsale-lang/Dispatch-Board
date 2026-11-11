import { NextResponse } from "next/server";
import { extendOngoingDispatchTasks } from "@/server/services/dispatch-task-repeat-service";
import { evaluateCronRequestAuthorization } from "@/server/services/scheduler-attempts";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!evaluateCronRequestAuthorization(request, process.env.CRON_SECRET).isAuthorized) {
      return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
    }
    const result = await extendOngoingDispatchTasks();
    return NextResponse.json(result, { status: result.failed ? 503 : 200 });
  } catch {
    return NextResponse.json({ error: "Unable to extend recurring Dispatch tasks." }, { status: 503 });
  }
}
