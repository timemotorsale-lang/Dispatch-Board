import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { cancelTaskRepairHandoff, getTaskRepairHandoff, linkExistingServiceOrder, listServiceHandoffOrders, requestTaskRepairHandoff, textField } from "@/server/repair-order/task-handoff";
import { RepairHandoffError } from "@/server/repair-order/task-handoff-record";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor?.isActive) return NextResponse.json({ error: "Sign in to manage the Service handoff." }, { status: 401 });
  const { id } = await params;
  const vehicleId = new URL(request.url).searchParams.get("vehicleId");
  if (vehicleId) {
    try {
      return NextResponse.json({ orders: await listServiceHandoffOrders(actor, id, vehicleId) }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      if (error instanceof RepairHandoffError) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Open orders could not be loaded." }, { status: 500 });
    }
  }
  const handoff = await getTaskRepairHandoff(actor, id, true);
  if (!handoff) return NextResponse.json({ error: "No Service handoff is available for this task." }, { status: 404 });
  return NextResponse.json(handoff, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") throw new RepairHandoffError("Same-site request required.", 403);
    const [actor, { id }, body] = await Promise.all([getCurrentUser(), params, request.json().catch(() => null)]);
    const taskId = textField(id, "task");
    if (body?.action === "request") {
      await requestTaskRepairHandoff(actor, taskId, body.receiverUserId, body.concern);
    } else if (body?.action === "cancel") {
      await cancelTaskRepairHandoff(actor, taskId, body.requestToken);
    } else if (body?.action === "link") {
      return NextResponse.json({ result: await linkExistingServiceOrder(actor, taskId, body) });
    } else {
      throw new RepairHandoffError("Choose a valid Service handoff action.", 400);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RepairHandoffError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Error && "code" in error && ["P2002", "P2034"].includes(String(error.code))) {
      return NextResponse.json({ error: "The handoff changed. Reload the task and try again." }, { status: 409 });
    }
    return NextResponse.json({ error: "The Service handoff could not be saved." }, { status: 500 });
  }
}
