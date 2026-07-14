import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { searchVehicleOperations } from "@/server/vehicle-discovery/service";
export async function GET(request: Request) { try { const parameters = new URL(request.url).searchParams; return NextResponse.json(await searchVehicleOperations(await getCurrentUser(), { query: parameters.get("q"), types: parameters.get("types"), limit: parameters.get("limit") })); } catch (error) { const message = error instanceof Error ? error.message : "Operational search failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400 }); } }
