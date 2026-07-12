import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { rollbackCrm } from "@/server/services/crm-rollout-service";
export async function POST(request: Request) { try { const payload = await request.json().catch(() => null); return NextResponse.json(await rollbackCrm(await getCurrentUser(), payload?.reason)); } catch (error) { const message = error instanceof Error ? error.message : "Unable to roll back CRM rollout."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message === "Manager access required." ? 403 : 400 }); } }
