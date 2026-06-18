import { NextResponse } from "next/server";

import { triggerScheduledBoardGeneration } from "@/server/services/board-generation";

function readBearerToken(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    throw new Error("CRON_SECRET is not configured.");
  }

  const authorizationToken = readBearerToken(request.headers.get("authorization"));
  const headerToken = request.headers.get("x-cron-secret")?.trim() || null;

  return authorizationToken === cronSecret || headerToken === cronSecret;
}

async function handleCronGenerateBoard(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json(
        {
          error: "Unauthorized cron request."
        },
        {
          status: 401
        }
      );
    }

    const result = await triggerScheduledBoardGeneration();

    return NextResponse.json(result, {
      status: result.status === "failed" ? 500 : 200
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run scheduled generation.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: 500
      }
    );
  }
}

export async function GET(request: Request) {
  return handleCronGenerateBoard(request);
}

export async function POST(request: Request) {
  return handleCronGenerateBoard(request);
}
