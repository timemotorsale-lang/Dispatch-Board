import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { saveVehiclePricing } from "@/server/inventory-unit/service";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const result = await saveVehiclePricing(await getCurrentUser(), (await context.params).id, await request.json());
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pricing request failed.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : message === "Inventory unit was not found." ? 404 : 400 });
  }
}
