import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { evaluateServiceIntakeReadiness } from "@/server/service-intake/readiness-service";
import { getServiceHandoffIntake, textField } from "@/server/repair-order/task-handoff";
import { RepairHandoffError } from "@/server/repair-order/task-handoff-record";

export async function POST(request: Request) {
  try {
    const [actor, body] = await Promise.all([getCurrentUser(), request.json().catch(() => null)]);
    if (body?.appointmentId !== undefined || body?.includeAppointmentChoices || body?.walkIn || body?.sourceTaskId !== undefined) {
      const handoff = await getServiceHandoffIntake(actor, textField(body.sourceTaskId, "source task"));
      if (body.locationId !== handoff.locationId || handoff.repairOrderId ||
          (handoff.task.customerId && handoff.task.customerId !== body.customerId) ||
          (handoff.task.vehicleId && handoff.task.vehicleId !== body.vehicleId)) {
        throw new RepairHandoffError("Select the pending handoff’s confirmed customer, vehicle, and Service location.");
      }
    }
    return NextResponse.json({ readiness: await evaluateServiceIntakeReadiness(actor, body) });
  } catch (error) {
    if (error instanceof RepairHandoffError) return NextResponse.json({ error: error.message }, { status: error.status });
    const message = error instanceof Error ? error.message : "Service readiness could not be evaluated.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
