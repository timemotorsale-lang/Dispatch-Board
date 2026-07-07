import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  saveAppointmentAutomationRuleDraftForManager,
  type RuleMutationInput
} from "@/server/services/appointment-automation-operations-console";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Manager access required.") return 403;
  if (message.includes("required") || message.includes("invalid")) return 400;
  if (message.includes("not available")) return 409;
  return 500;
}

function isRuleDraftPayload(payload: unknown): payload is RuleMutationInput {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<RuleMutationInput>;
  return Boolean(
    candidate.ruleCode &&
      candidate.triggerCode &&
      candidate.purposeCode &&
      candidate.name &&
      candidate.reason
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isRuleDraftPayload(payload)) {
    return NextResponse.json(
      { error: "Rule code, trigger, purpose, name, and reason are required." },
      { status: 400 }
    );
  }

  try {
    const console = await saveAppointmentAutomationRuleDraftForManager(user, payload);

    return NextResponse.json({ console });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save automation rule draft.";

    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
