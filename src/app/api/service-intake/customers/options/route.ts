import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getServiceIntakeCustomerOptions } from "@/server/service-intake/customer-service";

export async function GET() {
  try {
    return NextResponse.json(await getServiceIntakeCustomerOptions(await getCurrentUser()), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Authentication required.";
    return NextResponse.json({ error: unauthorized ? "Authentication required." : "Customer locations could not be loaded. Please retry." }, { status: unauthorized ? 401 : 500, headers: { "Cache-Control": "no-store" } });
  }
}
