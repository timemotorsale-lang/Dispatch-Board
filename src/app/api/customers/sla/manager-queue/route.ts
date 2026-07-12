import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCustomerSlaManagerQueue } from "@/server/services/customer-sla-service";
export async function GET() { try { return NextResponse.json(await getCustomerSlaManagerQueue(await getCurrentUser())); } catch (error) { const message = error instanceof Error ? error.message : "Unable to load the SLA manager queue."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message === "Manager access required." ? 403 : 400 }); } }
