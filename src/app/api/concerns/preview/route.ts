import { NextResponse } from "next/server";

import { concernErrorResponse } from "@/app/api/concerns/response";
import { getCurrentUser } from "@/server/auth/current-user";
import { previewConcernResolution } from "@/server/services/concern-resolution-service";

export async function POST(request: Request) {
  try {
    return NextResponse.json({ preview: await previewConcernResolution(await getCurrentUser(), await request.json().catch(() => null)) });
  } catch (error) {
    return concernErrorResponse(error);
  }
}
