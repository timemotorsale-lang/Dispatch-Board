import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { runAcquisitionCaseCommand } from "@/server/acquisition-appraisal/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await runAcquisitionCaseCommand(await getCurrentUser(), (await context.params).id, await request.json())); } catch (error) { const message = error instanceof Error ? error.message : "Acquisition command failed."; return NextResponse.json({ error: message }, { status: message.includes("Expected version") || message.includes("Idempotency") ? 409 : message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : message.includes("not enabled") ? 409 : 400 }); } }
