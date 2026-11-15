import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { RepairHistoryQueryError, searchRepairHistory } from "@/server/repair-order/history";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(await searchRepairHistory(await getCurrentUser(), Object.fromEntries(params)), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required:") ? 403 : error instanceof RepairHistoryQueryError ? 400 : 503;
    return NextResponse.json({ error: status === 401 ? "Sign in to find saved repair work." : status === 403 ? "Your account does not have access to repair history. Ask your manager for repair-record access." : status === 400 ? message : "Repair history is temporarily unavailable. Your saved records are unchanged; try again." }, { status, headers });
  }
}
