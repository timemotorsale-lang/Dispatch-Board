import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { previewVehicleRegistryImport } from "@/server/vehicle-registry/service";
export async function POST(request: Request) { try { return NextResponse.json(await previewVehicleRegistryImport(await getCurrentUser(), await request.json().catch(() => null))); } catch (error) { const message = error instanceof Error ? error.message : "Unable to preview vehicle import."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400 }); } }
