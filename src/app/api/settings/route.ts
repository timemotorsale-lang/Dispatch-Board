import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  getGenerationSettingsForManager,
  updateGenerationSettings
} from "@/server/services/app-settings-service";
import { isAppSettingsInput } from "@/server/validation/app-settings";

function getSettingsErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message === "Daily generation time, timezone, and business days are required." ||
    message.startsWith("App settings require") ||
    message.startsWith("App settings contain")
  ) {
    return 400;
  }

  return 500;
}

export async function GET() {
  const user = await getCurrentUser();

  try {
    const settings = await getGenerationSettingsForManager(user);

    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load settings right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getSettingsErrorStatus(message)
      }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isAppSettingsInput(payload)) {
    return NextResponse.json(
      {
        error: "Daily generation time, timezone, and business days are required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await updateGenerationSettings(user, payload);

    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update settings right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getSettingsErrorStatus(message)
      }
    );
  }
}
