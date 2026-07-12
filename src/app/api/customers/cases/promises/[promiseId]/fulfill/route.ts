import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { fulfillCustomerUpdatePromise } from "@/server/services/concern-resolution-service";

export async function POST(request: Request, context: { params: Promise<{ promiseId: string }> }) {
  try { const { promiseId } = await context.params; return NextResponse.json(await fulfillCustomerUpdatePromise(await getCurrentUser(), promiseId, await request.json().catch(() => null))); }
  catch (error) { const message = error instanceof Error ? error.message : "Unable to fulfill customer promise."; const status = message === "Authentication required." ? 401 : message.includes("permission") ? 403 : message === "Customer promise not found." ? 404 : 400; return NextResponse.json({ error: message }, { status }); }
}
