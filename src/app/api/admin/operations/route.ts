import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getBackgroundOperationsConsole, getRetentionPrivacyOperations } from "@/server/administration-resilience";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const actor = await getCurrentUser();
    const [retention, background] = await Promise.all([
      getRetentionPrivacyOperations(actor),
      getBackgroundOperationsConsole(actor, { limit: Number(url.searchParams.get("limit") ?? 50) }),
    ]);
    return NextResponse.json({ retention, background });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Administration operations request failed.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 403 });
  }
}
