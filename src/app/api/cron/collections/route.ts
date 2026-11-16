import { NextResponse } from "next/server";

import { runScheduledCollections } from "@/features/collections/server/automations";
import { evaluateCronRequestAuthorization } from "@/server/services/scheduler-attempts";

/**
 * Collections scheduled job. Safe to call every 15 minutes: it runs the daily automations
 * once per day after the automation time (default 9:15 am Chicago, Mon–Sat) and creates
 * the import reminder after the reminder time. Does nothing while COLLECTIONS_MODULE is OFF.
 */
async function handle(request: Request) {
  try {
    const authorization = evaluateCronRequestAuthorization(request, process.env.CRON_SECRET);
    if (!authorization.isAuthorized) return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
    return NextResponse.json(await runScheduledCollections());
  } catch (error) {
    console.error("[collections] scheduled job failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unable to run Collections automations." }, { status: 500 });
  }
}

export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
