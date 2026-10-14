import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { closeVendorInvoiceBatch } from "@/server/vendors/vendor-service";

function statusForError(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Vendor not found." || message === "Open batch not found.") return 404;
  if (message.startsWith("Only managers")) return 403;
  if (message.includes("required") || message.includes("valid") || message.includes("must be")) return 400;
  return 500;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ vendorId: string; batchId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { batchId, vendorId } = await context.params;
    const payload = await request.json().catch(() => null);
    return NextResponse.json(await closeVendorInvoiceBatch(user, vendorId, batchId, payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to close vendor batch.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
