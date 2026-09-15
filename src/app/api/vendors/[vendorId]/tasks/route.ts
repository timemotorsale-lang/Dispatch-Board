import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createVendorTask } from "@/server/vendors/vendor-service";

function statusForError(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Vendor not found." || message === "Assigned user not found.") return 404;
  if (message.includes("required") || message.includes("invalid") || message.includes("must be")) return 400;
  if (message.startsWith("Staff can only") || message.startsWith("Only managers")) return 403;
  return 500;
}

export async function POST(request: Request, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const user = await getCurrentUser();
    const { vendorId } = await context.params;
    const payload = await request.json().catch(() => null);
    return NextResponse.json(await createVendorTask(user, vendorId, payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create vendor task.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
