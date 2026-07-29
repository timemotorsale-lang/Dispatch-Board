import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { submitSalesManagerReviewRequest } from "@/server/sales/manager-review-request-service";

function getManagerReviewRequestErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (
    message.includes("is required.") ||
    message.includes("must be an object.") ||
    message.includes("must be normal, high, or urgent.") ||
    message.includes("characters or fewer")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  try {
    const payload = await request.json();
    const result = submitSalesManagerReviewRequest(user, payload);

    return NextResponse.json(result, { status: 501 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process manager review request.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getManagerReviewRequestErrorStatus(message)
      }
    );
  }
}
