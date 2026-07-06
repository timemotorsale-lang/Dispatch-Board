import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { attachRecommendedAppointmentResourceRequirement } from "@/server/services/appointment-resource-planning-service";

type AppointmentResourceRequirementsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getResourceRequirementErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Appointment not found.") {
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
    message === "Resource requirement payload must be an object." ||
    message === "Appointment id is required." ||
    message === "Expected appointment version is required." ||
    message === "Resource requirement recommendation is not available for this appointment." ||
    message === "Resource requirement type is not configured." ||
    message === "Resource requirements can only be attached to draft appointments." ||
    message.includes("Resource requirement")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  request: Request,
  context: AppointmentResourceRequirementsRouteContext
) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const payload = await request.json().catch(() => null);

  try {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Resource requirement payload must be an object.");
    }

    const requirement = await attachRecommendedAppointmentResourceRequirement(user, id, {
      requirementCode:
        typeof payload.requirementCode === "string" ? payload.requirementCode : "",
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
        requirement
      },
      {
        status: requirement.created ? 201 : 200
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to attach appointment resource requirement right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getResourceRequirementErrorStatus(message)
      }
    );
  }
}
