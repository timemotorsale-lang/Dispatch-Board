import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getTeamExecutionHealth } from "@/server/services/team-execution-health";

export async function GET(request: Request) { try { const date = new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10); return NextResponse.json(await getTeamExecutionHealth(await getCurrentUser(), date)); } catch (error) { const message = error instanceof Error ? error.message : "Unable to load team execution health."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("Manager access") ? 403 : 400 }); } }
