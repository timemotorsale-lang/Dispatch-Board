import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCrmRolloutStatus, updateCrmFeatureFlag } from "@/server/services/crm-rollout-service";
function status(message: string) { return message === "Authentication required." ? 401 : message === "Manager access required." ? 403 : 400; }
export async function GET() { try { return NextResponse.json(await getCrmRolloutStatus(await getCurrentUser())); } catch (error) { const message = error instanceof Error ? error.message : "Unable to load CRM rollout status."; return NextResponse.json({ error: message }, { status: status(message) }); } }
export async function PATCH(request: Request) { try { return NextResponse.json({ flag: await updateCrmFeatureFlag(await getCurrentUser(), await request.json().catch(() => null)) }); } catch (error) { const message = error instanceof Error ? error.message : "Unable to update CRM rollout."; return NextResponse.json({ error: message }, { status: status(message) }); } }
