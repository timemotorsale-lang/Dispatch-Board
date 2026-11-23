import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCourtesyCheck, saveCourtesyCheck } from "@/server/repair-order/courtesy-vehicle-check";

type Context = { params: Promise<{ id: string }> };

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "The courtesy vehicle check could not be loaded.";
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  const conflict = code === "P2002" || code === "P2034" || code === "VERSION_CONFLICT" || code === "IDEMPOTENCY_KEY_REUSED";
  const status = conflict ? 409 : /authentication required/i.test(message) ? 401
    : /capability required|management access/i.test(message) ? 403 : /was not found/i.test(message) ? 404 : 400;
  return NextResponse.json({ error: conflict ? "This courtesy check changed. Reload the saved check and review it before saving again." : message }, { status });
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const { check, canManage, canInspect } = await getCourtesyCheck(await getCurrentUser(), id);
    return NextResponse.json({ check, canManage, canInspect }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    return NextResponse.json(await saveCourtesyCheck(await getCurrentUser(), id, await request.json()));
  } catch (error) { return failure(error); }
}
