import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createRepairOrder } from "@/server/repair-order/service";

export async function POST(request: Request) {
  try {
    const result = await createRepairOrder(await getCurrentUser(), await request.json().catch(() => null), { enforceRollout: false });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Service-intake repair order could not be created.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
