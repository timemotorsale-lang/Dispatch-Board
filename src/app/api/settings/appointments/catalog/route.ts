import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getAppointmentCatalogAutomationAdminForManager } from "@/server/services/appointment-catalog-automation-admin";

function getCatalogAdminErrorStatus(message: string) {
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
    const catalog = await getAppointmentCatalogAutomationAdminForManager(user);

    return NextResponse.json({ catalog });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load appointment catalog automation admin right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getCatalogAdminErrorStatus(message)
      }
    );
  }
}
