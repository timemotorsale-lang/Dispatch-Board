import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getBoardReadModelForToday } from "@/server/services/board-read";

import { createBoardNotFoundMessage, getBoardReadErrorStatus } from "../response";

export async function GET() {
  const user = await getCurrentUser();

  try {
    const result = await getBoardReadModelForToday(user);

    if (!result.board) {
      return NextResponse.json(
        {
          ...result,
          error: createBoardNotFoundMessage(result.date)
        },
        {
          status: 404
        }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the board right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getBoardReadErrorStatus(message)
      }
    );
  }
}
