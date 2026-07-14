import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { createVehicleControlledOutput } from "@/server/vehicle-discovery/service";
export async function POST(request: Request) { try { return NextResponse.json(await createVehicleControlledOutput(await getCurrentUser(), await request.json().catch(() => null)), { status: 201 }); } catch (error) { const message = error instanceof Error ? error.message : "Controlled output failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : message.includes("version") || message.includes("Idempotency") ? 409 : 400 }); } }
