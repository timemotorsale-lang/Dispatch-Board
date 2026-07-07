import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createAppointmentAdminConfigurationExportForManager } from "@/server/services/appointment-admin-import-export";

function getConfigurationPortabilityStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  return 500;
}

export async function GET() {
  const user = await getCurrentUser();

  try {
    const exportPackage = await createAppointmentAdminConfigurationExportForManager(user);

    return NextResponse.json({ exportPackage });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to export appointment admin configuration right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getConfigurationPortabilityStatus(message)
      }
    );
  }
}
