import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  transitionAppointmentAutomationExecutionForManager,
  type ExecutionTransitionInput
} from "@/server/services/appointment-automation-operations-console";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Manager access required.") return 403;
  if (message.includes("required")) return 400;
  if (message.includes("not available")) return 409;
  return 500;
}

function isExecutionTransitionPayload(payload: unknown): payload is ExecutionTransitionInput {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<ExecutionTransitionInput>;
  return Boolean(candidate.executionId && candidate.action && candidate.reason);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isExecutionTransitionPayload(payload)) {
    return NextResponse.json(
      { error: "Execution id, action, and reason are required." },
      { status: 400 }
    );
  }

  try {
    const console = await transitionAppointmentAutomationExecutionForManager(user, payload);

    return NextResponse.json({ console });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to transition automation execution.";

    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
