import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { proposeAppointmentResourceCandidate } from "@/server/services/appointment-resource-planning-service";

type AppointmentResourceCandidateRouteContext = {
  params: Promise<{
    id: string;
    requirementId: string;
  }>;
};

function getResourceCandidateErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (
    message === "Appointment not found." ||
    message === "Resource requirement not found for this appointment."
  ) {
    return 404;
  }

  if (
    message === "Appointment schedule is not authorized." ||
    message === "Appointment command is not authorized."
  ) {
    return 403;
  }

  if (message === "Appointment version is stale.") {
    return 409;
  }

  if (
    message === "Resource candidate payload must be an object." ||
    message === "Appointment id is required." ||
    message === "Resource requirement is required." ||
    message === "Resource candidate is required." ||
    message === "Expected appointment version is required." ||
    message === "Resource candidates can only be proposed for draft appointments." ||
    message === "Resource candidate proposal requires a valid appointment time window." ||
    message === "Resource candidate is not available for this requirement." ||
    message.includes("Resource candidate")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  request: Request,
  context: AppointmentResourceCandidateRouteContext
) {
  const user = await getCurrentUser();
  const { id, requirementId } = await context.params;
  const payload = await request.json().catch(() => null);

  try {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Resource candidate payload must be an object.");
    }

    const proposal = await proposeAppointmentResourceCandidate(user, id, {
      requirementId,
      resourceId: typeof payload.resourceId === "string" ? payload.resourceId : "",
      expectedAppointmentVersion:
        typeof payload.expectedAppointmentVersion === "number"
          ? payload.expectedAppointmentVersion
          : 0,
      reasonCode: typeof payload.reasonCode === "string" ? payload.reasonCode : "",
      reasonNotes: typeof payload.reasonNotes === "string" ? payload.reasonNotes : "",
      correlationId:
        typeof payload.correlationId === "string" ? payload.correlationId : null
    });

    return NextResponse.json(
      {
        proposal
      },
      {
        status: proposal.created ? 201 : 200
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to propose appointment resource candidate right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getResourceCandidateErrorStatus(message)
      }
    );
  }
}
