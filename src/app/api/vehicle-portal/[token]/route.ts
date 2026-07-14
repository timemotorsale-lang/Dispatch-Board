import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getVehiclePortalView } from "@/server/customer-lifecycle/service";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) { try { const { token } = await context.params, requestHash = createHash("sha256").update(`${request.headers.get("user-agent") ?? "unknown"}:${new Date().toISOString().slice(0, 13)}`).digest("hex"); return NextResponse.json(await getVehiclePortalView(token, requestHash), { headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" } }); } catch (error) { const message = error instanceof Error ? error.message : "Portal access failed."; return NextResponse.json({ error: message }, { status: message.includes("invalid or expired") ? 410 : 400, headers: { "cache-control": "private, no-store" } }); } }
