import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getBackgroundOperationsConsole } from "@/server/administration-resilience";
export async function GET(request: Request) { try { const url = new URL(request.url); return NextResponse.json(await getBackgroundOperationsConsole(await getCurrentUser(), { limit: Number(url.searchParams.get("limit") ?? 50) })); } catch (error) { const message = error instanceof Error ? error.message : "Background operations request failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 403 }); } }
