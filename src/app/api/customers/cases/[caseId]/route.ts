import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getConcernResolutionPackage } from "@/server/services/concern-resolution-service";

export async function GET(_request: Request, context: { params: Promise<{ caseId: string }> }) {
  try { const { caseId } = await context.params; return NextResponse.json(await getConcernResolutionPackage(await getCurrentUser(), caseId)); }
  catch (error) { const message = error instanceof Error ? error.message : "Unable to load customer case."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message === "Concern not found." ? 404 : 400 }); }
}
