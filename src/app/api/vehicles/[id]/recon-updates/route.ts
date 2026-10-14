import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createReconProgressUpdate, listReconProgressUpdates } from "@/server/inventory-recon-updates/service";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Recon update request failed.";
  const status = message === "Authentication required." ? 401 : message === "Vehicle was not found." ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(await listReconProgressUpdates(await getCurrentUser(), (await context.params).id));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(await createReconProgressUpdate(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null)), { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
