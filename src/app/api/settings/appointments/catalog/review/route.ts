import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AppointmentCatalogApprovalReviewInput,
  reviewAppointmentCatalogDraftForManager
} from "@/server/services/appointment-catalog-automation-admin";

function getReviewErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message.includes("required") ||
    message.includes("No draft") ||
    message.includes("must")
  ) {
    return 400;
  }

  return 500;
}

function isReviewPayload(payload: unknown): payload is AppointmentCatalogApprovalReviewInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentCatalogApprovalReviewInput>;

  return Boolean(
    candidate.reason &&
      (candidate.action === "APPROVE" ||
        candidate.action === "REQUEST_CHANGES" ||
        candidate.action === "REJECT")
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isReviewPayload(payload)) {
    return NextResponse.json(
      {
        error: "Review action and reason are required."
      },
      { status: 400 }
    );
  }

  try {
    const catalog = await reviewAppointmentCatalogDraftForManager(user, payload);

    return NextResponse.json({ catalog });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to review appointment catalog draft.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getReviewErrorStatus(message)
      }
    );
  }
}
