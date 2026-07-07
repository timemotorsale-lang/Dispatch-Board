import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  transitionAppointmentAutomationRuleForManager,
  type RuleTransitionInput
} from "@/server/services/appointment-automation-operations-console";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Manager access required.") return 403;
  if (message.includes("required") || message.includes("not configured")) return 400;
  if (message.includes("not available")) return 409;
  return 500;
}

function isRuleTransitionPayload(payload: unknown): payload is RuleTransitionInput {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<RuleTransitionInput>;
  return Boolean(candidate.ruleCode && candidate.action && candidate.reason);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isRuleTransitionPayload(payload)) {
    return NextResponse.json(
      { error: "Rule code, action, and reason are required." },
      { status: 400 }
    );
  }

  try {
    const console = await transitionAppointmentAutomationRuleForManager(user, payload);

    return NextResponse.json({ console });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to transition automation rule.";

    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
