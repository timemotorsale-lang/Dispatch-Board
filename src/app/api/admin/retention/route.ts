import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getRetentionPrivacyOperations } from "@/server/administration-resilience";
export async function GET() { try { return NextResponse.json(await getRetentionPrivacyOperations(await getCurrentUser())); } catch (error) { const message = error instanceof Error ? error.message : "Retention request failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 403 }); } }
