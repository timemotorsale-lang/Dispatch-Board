import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getInventoryControlTowerProjection } from "@/server/inventory-control-tower";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return NextResponse.json(await getInventoryControlTowerProjection(await getCurrentUser(), { stage: url.searchParams.get("stage"), locationId: url.searchParams.get("locationId"), inventoryUnitId: url.searchParams.get("inventoryUnitId") }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Control tower request failed.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400 });
  }
}
