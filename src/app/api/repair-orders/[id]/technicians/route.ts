import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { addRepairOrderTechnician } from "@/server/shop-execution/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await addRepairOrderTechnician(await getCurrentUser(), id, await request.json().catch(() => null)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add the technician.";
    const status = message === "Authentication required." ? 401
      : message === "Manager access required." || message.startsWith("Vehicle capability required") ? 403
      : error instanceof EnterpriseCommandConflictError ? 409
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
