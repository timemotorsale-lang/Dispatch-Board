import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getVehicle360 } from "@/server/vehicle-360/service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await getVehicle360(await getCurrentUser(), (await context.params).id)); }
  catch (error) { const message = error instanceof Error ? error.message : "Unable to load Vehicle 360."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : message === "Vehicle was not found." ? 404 : 500 }); }
}
