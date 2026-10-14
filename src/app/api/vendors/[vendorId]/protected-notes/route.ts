import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  addVendorProtectedNote,
  unlockVendorProtectedNotes
} from "@/server/vendors/vendor-service";

function statusForError(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Vendor not found.") return 404;
  if (message === "Protected access code is incorrect.") return 403;
  if (message.includes("required") || message.includes("must be")) return 400;
  return 500;
}

export async function POST(request: Request, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const user = await getCurrentUser();
    const { vendorId } = await context.params;
    const payload = await request.json().catch(() => null);
    return NextResponse.json(await unlockVendorProtectedNotes(user, vendorId, payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to unlock protected vendor notes.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const user = await getCurrentUser();
    const { vendorId } = await context.params;
    const payload = await request.json().catch(() => null);
    return NextResponse.json(await addVendorProtectedNote(user, vendorId, payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save protected vendor note.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
