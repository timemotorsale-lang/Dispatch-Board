import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { decidePortalEstimate } from "@/server/customer-lifecycle/service";

export async function POST(request: Request, context: { params: Promise<{ token: string; approvalId: string }> }) { try { const { token, approvalId } = await context.params, body = await request.json().catch(() => null), requestHash = createHash("sha256").update(JSON.stringify(body)).digest("hex"); return NextResponse.json(await decidePortalEstimate(token, approvalId, body, requestHash)); } catch (error) { const message = error instanceof Error ? error.message : "Estimate decision failed."; return NextResponse.json({ error: message }, { status: message.includes("invalid or expired") ? 410 : message.includes("not found") ? 404 : 400, headers: { "cache-control": "private, no-store" } }); } }
