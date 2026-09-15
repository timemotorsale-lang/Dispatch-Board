import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateVendorWorkJob } from "@/server/vendors/vendor-service";

function statusForError(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Vendor not found." || message === "Vendor job not found.") return 404;
  if (message.startsWith("Only managers")) return 403;
  if (message.includes("required") || message.includes("valid") || message.includes("must be")) return 400;
  return 500;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ vendorId: string; jobId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { jobId, vendorId } = await context.params;
    const payload = await request.json().catch(() => null);
    return NextResponse.json(await updateVendorWorkJob(user, vendorId, jobId, payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update vendor job.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
