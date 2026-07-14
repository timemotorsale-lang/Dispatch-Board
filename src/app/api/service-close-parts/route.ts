import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { executeServiceClosePartsCommand, getServiceClosePartsWorkspace } from "@/server/service-close-parts/service";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Service close and parts request failed.";
  const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try { return NextResponse.json(await getServiceClosePartsWorkspace(await getCurrentUser())); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const result = await executeServiceClosePartsCommand(await getCurrentUser(), await request.json().catch(() => null));
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) { return failure(error); }
}
