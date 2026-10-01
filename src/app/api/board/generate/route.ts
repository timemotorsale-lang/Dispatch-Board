import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  previewManualBoardGeneration,
  triggerManualBoardGeneration
} from "@/server/services/board-generation";

function getBoardGenerationErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Board date is required." ||
    message === "Board date must use YYYY-MM-DD format." ||
    message === "Board date must be a valid calendar date."
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = (await request.json().catch(() => null)) as {
    boardDate?: unknown;
    selectedCandidateKeys?: unknown;
  } | null;

  if (typeof payload?.boardDate !== "string") {
    return NextResponse.json(
      {
        error: "Board date is required."
      },
      {
        status: 400
      }
    );
  }

  if (
    payload.selectedCandidateKeys !== undefined &&
    (!Array.isArray(payload.selectedCandidateKeys) ||
      payload.selectedCandidateKeys.length > 500 ||
      payload.selectedCandidateKeys.some(
        (value) => typeof value !== "string" || !value.trim() || value.length > 240
      ))
  ) {
    return NextResponse.json(
      { error: "Selected work items must be a valid list." },
      { status: 400 }
    );
  }

  try {
    const result = await triggerManualBoardGeneration(user, payload.boardDate, {
      selectedCandidateKeys: payload.selectedCandidateKeys as string[] | undefined
    });

    return NextResponse.json(result, {
      status: result.status === "success" ? 200 : 500
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate the board right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getBoardGenerationErrorStatus(message)
      }
    );
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const boardDate = new URL(request.url).searchParams.get("boardDate");

  if (!boardDate) {
    return NextResponse.json({ error: "Board date is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(await previewManualBoardGeneration(user, boardDate));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to preview today's work.";

    return NextResponse.json(
      { error: message },
      { status: getBoardGenerationErrorStatus(message) }
    );
  }
}
