import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { closeConcernResolution } from "@/server/services/concern-resolution-service";

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  try { const { caseId } = await context.params; return NextResponse.json(await closeConcernResolution(await getCurrentUser(), caseId, await request.json().catch(() => null))); }
  catch (error) { const message = error instanceof Error ? error.message : "Unable to resolve customer case."; const status = message === "Authentication required." ? 401 : message === "Manager access required." ? 403 : message === "Concern not found." ? 404 : message.includes("cannot close") ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
}
