import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { executeCustomerLifecycleCommand, getCustomerLifecycleWorkspace } from "@/server/customer-lifecycle/service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Customer lifecycle request failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400 }); }
export async function GET() { try { return NextResponse.json(await getCustomerLifecycleWorkspace(await getCurrentUser())); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { const result = await executeCustomerLifecycleCommand(await getCurrentUser(), await request.json().catch(() => null)); return NextResponse.json(result, { status: result.duplicate ? 200 : 201 }); } catch (error) { return failure(error); } }
