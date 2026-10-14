import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { evaluateFrontlineEscalations } from "@/server/inventory-frontline/service";
export async function POST() { try { return NextResponse.json(await evaluateFrontlineEscalations(await getCurrentUser())); } catch (error) { const message = error instanceof Error ? error.message : "Unable to evaluate frontline escalations.", status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400; return NextResponse.json({ error: message }, { status }); } }
