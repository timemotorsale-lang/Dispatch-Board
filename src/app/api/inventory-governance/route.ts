import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getInventoryGovernanceConsole } from "@/server/inventory-governance/service";

export async function GET() {
  try { return NextResponse.json(await getInventoryGovernanceConsole(await getCurrentUser())); }
  catch (error) { const message = error instanceof Error ? error.message : "Inventory governance request failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("privileges") ? 403 : 400 }); }
}
