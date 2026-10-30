import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { dealIdentityFailure } from "@/server/deal-continuity/http";
import { createDealCustomer, createDealVehicle, dealCustomer, dealVehicle, dealIdentityOptions, searchDealCustomers, searchDealVehicles } from "@/server/deal-continuity/identities";
import { resolveDealSource } from "@/server/deal-continuity/service";
export async function GET(request: Request) {
  try {
    const actor = await getCurrentUser(), params = new URL(request.url).searchParams;
    let result;
    switch (params.get("type")) {
      case "customer": result = await dealCustomer(actor, params.get("id") ?? ""); break;
      case "vehicle": result = await dealVehicle(actor, params.get("id") ?? ""); break;
      case "vehicles": result = await searchDealVehicles(actor, params); break;
      case "options": result = await dealIdentityOptions(actor, params.get("recordType") === "vehicle" ? "vehicle" : "customer"); break;
      case "source": result = await resolveDealSource(actor, { sourceDraftId: params.get("sourceDraftId") ?? undefined, sourceJacketId: params.get("sourceJacketId") ?? undefined }); break;
      default: result = await searchDealCustomers(actor, params);
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return dealIdentityFailure(error); }
}
export async function POST(request: Request) {
  try { const actor = await getCurrentUser(), raw = await request.json(); return NextResponse.json(raw.type === "vehicle" ? await createDealVehicle(actor, raw) : await createDealCustomer(actor, raw), { status: 201, headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return dealIdentityFailure(error); }
}
