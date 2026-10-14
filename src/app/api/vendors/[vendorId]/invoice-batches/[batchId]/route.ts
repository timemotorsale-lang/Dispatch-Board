import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getVendorInvoiceBatchJobs } from "@/server/vendors/vendor-service";

function statusForError(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Vendor batch not found.") return 404;
  return 500;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ vendorId: string; batchId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { batchId, vendorId } = await context.params;
    return NextResponse.json(await getVendorInvoiceBatchJobs(user, vendorId, batchId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load vendor batch.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
