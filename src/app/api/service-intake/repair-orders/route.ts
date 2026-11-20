import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createRepairOrder } from "@/server/repair-order/service";
import { getServiceHandoffIntake, textField } from "@/server/repair-order/task-handoff";
import { RepairHandoffError } from "@/server/repair-order/task-handoff-record";
import { isManager } from "@/server/policies/access";
import { prisma } from "@/server/db/client";

function createLinkedResult(id: string, organizationId: string, locationId: string) {
  return prisma.repairOrder.findFirstOrThrow({
    where: { id, organizationId, locationId },
    select: { id: true, repairOrderNumber: true }
  });
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") throw new RepairHandoffError("Same-site request required.", 403);
    const [actor, body] = await Promise.all([getCurrentUser(), request.json().catch(() => null)]);
    if (body?.sourceTaskId !== undefined) {
      if (!actor?.isActive) throw new RepairHandoffError("Sign in to complete the Service handoff.", 401);
      const taskId = textField(body.sourceTaskId, "source task");
      const requestToken = textField(body.requestToken, "handoff reference");
      const handoff = await getServiceHandoffIntake(actor, taskId);
      if (handoff.requestToken !== requestToken || body.locationId !== handoff.locationId || body.intakeSource === "INVENTORY_RECON") {
        throw new RepairHandoffError("Reopen the pending handoff at its Service location.");
      }
      if (handoff.repairOrderId) {
        const order = await createLinkedResult(handoff.repairOrderId, handoff.organizationId, handoff.locationId);
        return NextResponse.json({ duplicate: true, result: order }, { status: 200 });
      }
      const result = await createRepairOrder(actor, body, { enforceRollout: false, handoffClaim: {
        taskId, requestToken, locationId: handoff.locationId, organizationId: handoff.organizationId,
        actorUserId: actor.id, canAcceptForReceiver: isManager(actor)
      } });
      return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
    }
    const result = await createRepairOrder(actor, body, { enforceRollout: false });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof RepairHandoffError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Error && "code" in error && ["P2002", "P2034"].includes(String(error.code))) {
      return NextResponse.json({ error: "The repair order or handoff changed. Reopen the intake to see the current record." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Service-intake repair order could not be created.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
