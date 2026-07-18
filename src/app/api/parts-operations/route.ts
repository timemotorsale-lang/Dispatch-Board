import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPartsOperationsWorkspace } from "@/server/parts-operations/service";

export async function GET() {
  try {
    return NextResponse.json(await getPartsOperationsWorkspace(await getCurrentUser()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parts Operations could not be loaded.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
