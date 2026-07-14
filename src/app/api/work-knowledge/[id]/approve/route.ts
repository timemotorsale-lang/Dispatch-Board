import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { approveWorkKnowledge } from "@/server/vehicle-discovery/service";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await approveWorkKnowledge(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null))); } catch (error) { const message = error instanceof Error ? error.message : "Knowledge approval failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : message.includes("version") || message.includes("Idempotency") ? 409 : 400 }); } }
