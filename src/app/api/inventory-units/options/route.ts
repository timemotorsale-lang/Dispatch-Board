import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getInventoryUnitCreateOptions } from "@/server/inventory-unit/service";
export async function GET() { try { return NextResponse.json(await getInventoryUnitCreateOptions(await getCurrentUser())); } catch (error) { const message = error instanceof Error ? error.message : "Unable to load inventory options."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400 }); } }
