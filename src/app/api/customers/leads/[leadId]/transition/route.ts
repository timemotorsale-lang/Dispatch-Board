import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { transitionCustomerLead } from "@/server/services/customer-lead-service";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Lead not found.") return 404;
  if (message.includes("permission")) return 403;
  if (message.includes("cannot transition")) return 409;
  return 400;
}

export async function POST(request: Request, context: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await context.params;
    return NextResponse.json(await transitionCustomerLead(await getCurrentUser(), leadId, await request.json()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to transition customer lead.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
