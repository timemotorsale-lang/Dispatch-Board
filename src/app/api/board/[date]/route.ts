import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone } from "@/server/validation/board-date";
import { getBoardReadModelForDate, getTaskOperationsReadModelForDate } from "@/server/services/board-read";

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
    const operations = new URL(_request.url).searchParams.get("scope") === "operations";
    if (operations && !user?.isActive) return NextResponse.json({ error: user ? "Active staff access required." : "Authentication required." }, { status: user ? 403 : 401 });
    const today = operations ? getBoardDateInTimeZone(new Date(), (await getGenerationSettings()).timezone) : null;
    const result = operations && date === today ? await getTaskOperationsReadModelForDate(user, date) : await getBoardReadModelForDate(user, date);

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
