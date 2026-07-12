import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { evaluateCustomerSla } from "@/server/services/customer-sla-service";
export async function POST() { try { return NextResponse.json(await evaluateCustomerSla(await getCurrentUser())); } catch (error) { const message = error instanceof Error ? error.message : "Unable to evaluate customer SLAs."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message === "Manager access required." ? 403 : 400 }); } }
