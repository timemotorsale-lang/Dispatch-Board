import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createServiceIntakeCustomer } from "@/server/service-intake/customer-service";

export async function POST(request: Request) {
  try {
    const result = await createServiceIntakeCustomer(await getCurrentUser(), await request.json().catch(() => ({})));
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Customer could not be created.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
