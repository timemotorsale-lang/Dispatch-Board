import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getCustomer360ReadModel } from "@/server/services/customer-console-read-service";
import { assertCrmFeatureEnabled } from "@/server/services/crm-rollout-service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(); await assertCrmFeatureEnabled(user, "CRM_CUSTOMER_360");
    const parameters = new URL(request.url).searchParams;
    return NextResponse.json(await getCustomer360ReadModel(user, { tab: parameters.get("tab"), customerId: parameters.get("customerId") }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load Customer 360.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message === "Customer not found." ? 404 : 500 });
  }
}
