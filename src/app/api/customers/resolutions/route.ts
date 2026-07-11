import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getCustomerResolutionReadModel } from "@/server/services/customer-console-read-service";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(await getCustomerResolutionReadModel(await getCurrentUser(), { queue: params.get("queue"), query: params.get("query"), caseId: params.get("caseId"), detail: params.get("detail") }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load customer resolutions.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 500 });
  }
}
