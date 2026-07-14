import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { createWorkKnowledgeDraft, getWorkKnowledgeWorkspace } from "@/server/vehicle-discovery/service";
function failure(error: unknown) { const message = error instanceof Error ? error.message : "Knowledge request failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : message.includes("Idempotency") || message.includes("version") ? 409 : 400 }); }
export async function GET() { try { return NextResponse.json(await getWorkKnowledgeWorkspace(await getCurrentUser())); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { return NextResponse.json(await createWorkKnowledgeDraft(await getCurrentUser(), await request.json().catch(() => null)), { status: 201 }); } catch (error) { return failure(error); } }
