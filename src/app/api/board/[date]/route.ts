import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getBoardReadModelForDate } from "@/server/services/board-read";

import { createBoardNotFoundMessage, getBoardReadErrorStatus } from "../response";

type RouteContext = {
  params: Promise<{
    date: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const { date } = await context.params;

  try {
    const result = await getBoardReadModelForDate(user, date);

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
