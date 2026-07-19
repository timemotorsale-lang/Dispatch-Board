import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { executeIntegrationSecurityCommand, getIntegrationSecurityConsole } from "@/server/integrations/security-service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Integration security request failed."; const status = message === "Authentication required." ? 401 : message.includes("manager privileges") ? 403 : /reused|conflict/i.test(message) ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
export async function GET() { try { return NextResponse.json(await getIntegrationSecurityConsole(await getCurrentUser())); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { return NextResponse.json(await executeIntegrationSecurityCommand(await getCurrentUser(), await request.json().catch(() => null))); } catch (error) { return failure(error); } }
