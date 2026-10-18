import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { correctInventoryUnitNumber, InventoryNumberCorrectionError } from "@/server/inventory-unit/number-correction-service";

function failure(error: unknown) {
  if (error instanceof InventoryNumberCorrectionError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof EnterpriseCommandConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
  const message = error instanceof Error ? error.message : "";
  if (message === "Authentication required.") return NextResponse.json({ error: message }, { status: 401 });
  if (message.startsWith("Vehicle capability required")) return NextResponse.json({ error: message }, { status: 403 });
  return NextResponse.json({ error: "Inventory number correction failed. Reload and try again." }, { status: 500 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(await correctInventoryUnitNumber(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null)));
  } catch (error) { return failure(error); }
}
