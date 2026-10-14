import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createRepairVendor, listRepairVendors } from "@/server/shop-completion/service";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Outside vendor request failed.";
  const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : /version|Idempotency|unique/i.test(message) ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try { return NextResponse.json(await listRepairVendors(await getCurrentUser())); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try { return NextResponse.json(await createRepairVendor(await getCurrentUser(), await request.json()), { status: 201 }); }
  catch (error) { return failure(error); }
}
