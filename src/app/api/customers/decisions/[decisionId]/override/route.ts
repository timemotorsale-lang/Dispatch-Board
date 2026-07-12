import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { overrideCrmDecision } from "@/server/services/crm-decision-service";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Manager access required.") return 403;
  if (message === "CRM decision not found.") return 404;
  if (message === "CRM decision has already been overridden.") return 409;
  return 400;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ decisionId: string }> }
) {
  try {
    const { decisionId } = await context.params;
    const payload = await request.json();
    return NextResponse.json({
      decision: await overrideCrmDecision(await getCurrentUser(), decisionId, payload)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to override CRM decision.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
