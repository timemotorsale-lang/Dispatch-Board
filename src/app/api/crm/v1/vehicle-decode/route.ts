import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { CrmVehicleDecodeError, decodeCrmVehicle } from "@/server/services/crm-vehicle-decode-service";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await decodeCrmVehicle(await getCurrentUser(), await request.json().catch(() => null)), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vehicle decoding failed.";
    const status = error instanceof CrmVehicleDecodeError ? error.status : message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : message.startsWith("VIN must") ? 400 : 503;
    return NextResponse.json({ error: status === 503 ? "Vehicle lookup is temporarily unavailable. Retry or enter verified details manually." : message }, { status });
  }
}
