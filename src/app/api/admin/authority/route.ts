import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { executeAuthorityCommand } from "@/server/inventory-governance/authority-service";
export async function POST(request: Request) { try { return NextResponse.json(await executeAuthorityCommand(await getCurrentUser(), await request.json().catch(() => null))); } catch (error) { const message = error instanceof Error ? error.message : "Authority command failed."; const status = message === "Authentication required." ? 401 : message.includes("General Manager") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400; return NextResponse.json({ error: message }, { status }); } }
