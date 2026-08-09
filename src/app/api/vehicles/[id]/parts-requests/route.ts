import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createVehiclePartsRequest, listVehiclePartsRequests } from "@/server/vehicle-parts-requests/service";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Vehicle parts request failed.";
  const status = message === "Authentication required." ? 401 : message === "Vehicle was not found." ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(await listVehiclePartsRequests(await getCurrentUser(), (await context.params).id));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(await createVehiclePartsRequest(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null)), { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
