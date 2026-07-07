import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AppointmentAutomationSimulationInput,
  simulateAppointmentCatalogAutomationForManager
} from "@/server/services/appointment-catalog-automation-admin";

function getSimulationErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (message.includes("required") || message.includes("not configured")) {
    return 400;
  }

  return 500;
}

function isSimulationPayload(payload: unknown): payload is AppointmentAutomationSimulationInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentAutomationSimulationInput>;

  return Boolean(candidate.purposeCode && candidate.outcomeCode && candidate.followUpDispositionCode);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isSimulationPayload(payload)) {
    return NextResponse.json(
      {
        error: "Purpose, outcome, and follow-up disposition are required."
      },
      { status: 400 }
    );
  }

  try {
    const simulation = await simulateAppointmentCatalogAutomationForManager(user, payload);

    return NextResponse.json({ simulation });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to simulate appointment automation right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getSimulationErrorStatus(message)
      }
    );
  }
}
