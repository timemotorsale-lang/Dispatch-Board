import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { changeLaborCatalogSettings, getLaborCatalogSettings } from "@/server/services/labor-catalog-settings";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Catalog settings are unavailable.";
  return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message === "Manager access required." || message.startsWith("Vehicle capability required") ? 403 : 400 });
}

export async function GET() {
  try { return NextResponse.json(await getLaborCatalogSettings(await getCurrentUser()), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try { return NextResponse.json(await changeLaborCatalogSettings(await getCurrentUser(), await request.json().catch(() => null))); }
  catch (error) { return failure(error); }
}
