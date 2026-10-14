import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getVendorProfile, updateVendor } from "@/server/vendors/vendor-service";

function statusForError(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Vendor not found.") return 404;
  if (message.startsWith("Only managers")) return 403;
  if (message.includes("required") || message.includes("invalid") || message.includes("must be")) return 400;
  return 500;
}

export async function GET(_request: Request, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const user = await getCurrentUser();
    const { vendorId } = await context.params;
    return NextResponse.json(await getVendorProfile(user, vendorId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load vendor.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const user = await getCurrentUser();
    const { vendorId } = await context.params;
    const payload = await request.json().catch(() => null);
    return NextResponse.json(await updateVendor(user, vendorId, payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update vendor.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
