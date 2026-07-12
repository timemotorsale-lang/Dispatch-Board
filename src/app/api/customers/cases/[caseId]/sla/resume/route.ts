import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { resumeCustomerSla } from "@/server/services/customer-sla-service";
export async function POST(_request: Request, context: { params: Promise<{ caseId: string }> }) { try { const { caseId } = await context.params; return NextResponse.json(await resumeCustomerSla(await getCurrentUser(), caseId)); } catch (error) { const message = error instanceof Error ? error.message : "Unable to resume customer SLA."; const status = message === "Authentication required." ? 401 : message === "Manager access required." ? 403 : message.includes("does not have") ? 409 : 400; return NextResponse.json({ error: message }, { status }); } }
