import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getIntegrationRegistry, ingestIntegrationRecords, listIntegrationConflicts, reconcileIntegrationConflicts } from "@/server/integrations";
function failure(error: unknown) { const message = error instanceof Error ? error.message : "Integration request failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 400 }); }
export async function GET(request: Request) { try { const user = assertAuthenticatedUser(await getCurrentUser()); const url = new URL(request.url); return NextResponse.json({ registry: getIntegrationRegistry(), conflicts: listIntegrationConflicts({ organizationId: INITIAL_ORGANIZATION.id, system: (url.searchParams.get("system") as never) || undefined, status: (url.searchParams.get("status") as never) || undefined }), actorUserId: user.id }); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { const user = assertAuthenticatedUser(await getCurrentUser()); const body = await request.json(); if (body.action === "RECONCILE") return NextResponse.json(reconcileIntegrationConflicts({ ...body, actorUserId: user.id, organizationId: INITIAL_ORGANIZATION.id })); return NextResponse.json(ingestIntegrationRecords({ ...body, organizationId: INITIAL_ORGANIZATION.id })); } catch (error) { return failure(error); } }
