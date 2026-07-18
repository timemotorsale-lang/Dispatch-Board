import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { executeR11IntegrationCommand, getR11IntegrationEcosystem } from "@/server/integrations/r11-service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Integration ecosystem request failed."; const status = message === "Authentication required." ? 401 : message.includes("manager privileges") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
export async function GET() { try { return NextResponse.json(await getR11IntegrationEcosystem(await getCurrentUser())); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { return NextResponse.json(await executeR11IntegrationCommand(await getCurrentUser(), await request.json().catch(() => null))); } catch (error) { return failure(error); } }
