import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getCustomerDashboardReadModel } from "@/server/services/customer-console-read-service";

export async function GET() {
  try {
    return NextResponse.json(await getCustomerDashboardReadModel(await getCurrentUser()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the customer dashboard.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 500 });
  }
}
