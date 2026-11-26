import { NextResponse } from "next/server";

import { getCalendarUser as getCurrentUser } from "@/server/auth/workflow-user";
import { submitAndExecuteAppointmentCommand } from "@/server/services/appointment-command-execution-service";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getEarlyReconContext } from "@/server/inventory-execution/early-recon";

function getAppointmentCommandErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Appointment command is not authorized.") {
    return 403;
  }

  if (message === "Appointment not found.") {
    return 404;
  }

  if (message === "Idempotency key already used for a different appointment command.") {
    return 409;
  }

  if (
    message === "Appointment command payload must be an object." ||
    message === "Appointment command payload must be a JSON object." ||
    message === "Appointment command requires an organization and location." ||
    message.startsWith("Appointment command") ||
    message.startsWith("CREATE_DRAFT") ||
    message.includes("appointment commands require")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  try {
    if (payload?.commandType === "CREATE_DRAFT" && payload.payload?.sourceSnapshot?.inventoryUnitId !== undefined) {
      const vehicleId = payload.payload.vehicleSnapshot?.vehicleId;
      const recon = user && typeof vehicleId === "string" ? await getEarlyReconContext(user, vehicleId) : null;
      if (!user) throw new Error("Authentication required.");
      if (!recon?.canBook || payload.payload.sourceSnapshot.inventoryUnitId !== recon.id ||
        payload.organizationId !== INITIAL_ORGANIZATION.id || payload.locationId !== recon.locationId ||
        payload.payload.sourceType !== "MANUAL" || payload.payload.sourceReference !== recon.id) {
        throw new Error("Appointment command is not authorized.");
      }
      payload.payload.customerSnapshot = null;
      payload.payload.vehicleSnapshot = {
        vehicleId: recon.vehicle.id, displayName: [recon.vehicle.year, recon.vehicle.make, recon.vehicle.model].filter(Boolean).join(" ") || recon.vehicle.vehicleNumber,
        vehicleNumber: recon.vehicle.vehicleNumber, vin: recon.vehicle.vin, stockNumber: recon.vehicle.stockNumber,
      };
    }
    const result = await submitAndExecuteAppointmentCommand(user, payload);

    return NextResponse.json(
      {
        command: result.command,
        duplicate: result.duplicate,
        accepted: result.accepted,
        conflict: result.conflict,
        execution: result.execution
      },
      {
        status: result.conflict ? 409 : result.duplicate ? 200 : 202
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit the appointment command right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getAppointmentCommandErrorStatus(message)
      }
    );
  }
}
