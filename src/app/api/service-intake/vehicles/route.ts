import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createRegistryVehicle } from "@/server/vehicle-registry/service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await createRegistryVehicle(await getCurrentUser(), body, { enforceRollout: false });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Service-intake vehicle could not be created.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
