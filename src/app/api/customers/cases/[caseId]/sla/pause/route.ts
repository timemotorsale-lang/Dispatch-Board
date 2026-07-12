import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { pauseCustomerSla } from "@/server/services/customer-sla-service";
export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) { try { const { caseId } = await context.params; return NextResponse.json(await pauseCustomerSla(await getCurrentUser(), caseId, await request.json().catch(() => null))); } catch (error) { const message = error instanceof Error ? error.message : "Unable to pause customer SLA."; const status = message === "Authentication required." ? 401 : message === "Manager access required." ? 403 : message.includes("already") ? 409 : 400; return NextResponse.json({ error: message }, { status }); } }
