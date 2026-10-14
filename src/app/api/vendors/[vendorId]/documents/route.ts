import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { uploadVendorDocument } from "@/server/vendors/vendor-service";

function statusForError(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Vendor not found.") return 404;
  if (message.includes("Choose") || message.includes("limited") || message.includes("empty") || message.includes("must be")) return 400;
  return 500;
}

export async function POST(request: Request, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const user = await getCurrentUser();
    const { vendorId } = await context.params;
    const formData = await request.formData();
    return NextResponse.json(await uploadVendorDocument(user, vendorId, formData), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload vendor document.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
