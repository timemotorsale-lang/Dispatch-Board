import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createCustomerLead, listRecentCustomerLeads } from "@/server/services/customer-lead-service";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Customer not found.") return 404;
  if (message.includes("idempotency key was already used")) return 409;
  if (message === "No eligible lead owner is available.") return 409;
  return 400;
}

export async function GET(request: Request) {
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 5);
    return NextResponse.json({ leads: await listRecentCustomerLeads(await getCurrentUser(), limit) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load customer leads.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}

export async function POST(request: Request) {
  try {
    const result = await createCustomerLead(await getCurrentUser(), await request.json());
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create customer lead.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
