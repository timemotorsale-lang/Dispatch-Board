import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createCustomerLead, listRecentCustomerLeads } from "@/server/services/customer-lead-service";
import { assertCrmFeatureEnabled } from "@/server/services/crm-rollout-service";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Customer not found.") return 404;
  if (message.includes("idempotency key was already used")) return 409;
  if (message === "No eligible lead owner is available.") return 409;
  return 400;
}

export async function GET(request: Request) {
  try {
    await assertCrmFeatureEnabled(await getCurrentUser(), "CRM_LEADS");
    const user = await getCurrentUser(); const limit = Number(new URL(request.url).searchParams.get("limit") ?? 5);
    return NextResponse.json({ leads: await listRecentCustomerLeads(user, limit) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load customer leads.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(); await assertCrmFeatureEnabled(user, "CRM_LEADS");
    const result = await createCustomerLead(user, await request.json());
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create customer lead.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
