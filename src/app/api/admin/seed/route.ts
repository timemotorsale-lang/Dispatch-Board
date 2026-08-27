import { NextResponse } from "next/server";

import { seedDevelopmentData } from "../../../../../prisma/seed";
import { evaluateCronRequestAuthorization } from "@/server/services/scheduler-attempts";

async function handleSeed(request: Request) {
  try {
    const authorization = evaluateCronRequestAuthorization(request, process.env.CRON_SECRET);

    if (!authorization.isAuthorized) {
      return NextResponse.json({ error: "Unauthorized seed request." }, { status: 401 });
    }

    await seedDevelopmentData();

    return NextResponse.json({
      ok: true,
      message: "Development seed completed."
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Seed failed."
      },
      {
        status: 500
      }
    );
  }
}

export async function POST(request: Request) {
  return handleSeed(request);
}
