import { NextResponse } from "next/server";

import { evaluateConcernEscalationsForSystem } from "@/server/services/concern-resolution-service";
import { evaluateCronRequestAuthorization } from "@/server/services/scheduler-attempts";

async function handle(request: Request) {
  try {
    const authorization = evaluateCronRequestAuthorization(request, process.env.CRON_SECRET);
    if (!authorization.isAuthorized) return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
    return NextResponse.json(await evaluateConcernEscalationsForSystem());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to evaluate concern escalations." }, { status: 500 });
  }
}

export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
