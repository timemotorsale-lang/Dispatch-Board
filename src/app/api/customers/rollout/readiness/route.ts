import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { createCrmReadinessSnapshot } from "@/server/services/crm-rollout-service";
export async function POST(request: Request) { try { return NextResponse.json(await createCrmReadinessSnapshot(await getCurrentUser(), await request.json().catch(() => ({})))); } catch (error) { const message = error instanceof Error ? error.message : "Unable to create CRM readiness snapshot."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message === "Manager access required." ? 403 : 400 }); } }
