import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getCrmDecision } from "@/server/services/crm-decision-service";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "CRM decision not found.") return 404;
  return 400;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ decisionId: string }> }
) {
  try {
    const { decisionId } = await context.params;
    return NextResponse.json({ decision: await getCrmDecision(await getCurrentUser(), decisionId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load CRM decision.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
