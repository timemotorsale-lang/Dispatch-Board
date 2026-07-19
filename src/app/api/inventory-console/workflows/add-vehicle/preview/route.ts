import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { previewAddVehicleIdentity } from "@/server/inventory-workflow-launcher/add-vehicle";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Vehicle identity preview failed.";
  const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(await previewAddVehicleIdentity(await getCurrentUser(), await request.json().catch(() => null)));
  } catch (error) {
    return failure(error);
  }
}
