import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createRepairVendorWork, reassignRepairVendorWork, updateRepairVendorWork } from "@/server/shop-completion/service";

function failure(error: unknown) {
  if (error instanceof Error && "code" in error && ["P2002", "P2034"].includes(String(error.code))) {
    return NextResponse.json({ error: "The repair order or vendor handoff changed. Reopen the current order before trying again." }, { status: 409 });
  }
  const message = error instanceof Error ? error.message : "Outside repair request failed.";
  const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError || /version|Idempotency/i.test(message) ? 409 : message.includes("not found") ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Outside repair request must be an object.");
    const { action, vendorWorkId, ...value } = body as Record<string, unknown>;
    const result = action === "UPDATE"
      ? await updateRepairVendorWork(await getCurrentUser(), id, String(vendorWorkId ?? ""), value)
      : action === "REASSIGN_VENDOR"
        ? await reassignRepairVendorWork(await getCurrentUser(), id, String(vendorWorkId ?? ""), value)
      : action === "CREATE"
        ? await createRepairVendorWork(await getCurrentUser(), id, value)
        : (() => { throw new Error("Outside repair action is invalid."); })();
    return NextResponse.json(result, { status: "duplicate" in result && result.duplicate ? 200 : 201 });
  } catch (error) { return failure(error); }
}
