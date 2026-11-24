import { NextResponse } from "next/server";
import { isTrustedAppMutation } from "@/lib/app-request-origin";
import { getDealsUser } from "@/server/auth/workflow-user";
import { manageRentalDealActivity } from "@/server/sales-documents/dashboard-operations";
import { SalesDocumentsError } from "@/server/sales-documents/domain";

export async function POST(request: Request) {
  if (!isTrustedAppMutation(request)) return NextResponse.json({ error: "Reload the rental drawer before saving." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Choose a rental activity." }, { status: 400 });
  try {
    return NextResponse.json(await manageRentalDealActivity(await getDealsUser(), body));
  } catch (error) {
    if (error instanceof SalesDocumentsError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "The save could not be confirmed. Retry the same entry." }, { status: 503 });
  }
}
