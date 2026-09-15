import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  createVendor,
  getVendorRegistryReadModel,
  normalizeVendorListQuery
} from "@/server/vendors/vendor-service";

function statusForError(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.startsWith("Only managers")) return 403;
  if (message.includes("required") || message.includes("invalid") || message.includes("must be")) return 400;
  return 500;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await getCurrentUser();
    return NextResponse.json(await getVendorRegistryReadModel(user, normalizeVendorListQuery(url.searchParams)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load vendors.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const payload = await request.json().catch(() => null);
    return NextResponse.json(await createVendor(user, payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create vendor.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
