import { NextResponse } from "next/server";

import { concernErrorResponse } from "@/app/api/concerns/response";
import { getCurrentUser } from "@/server/auth/current-user";
import { closeConcernResolution } from "@/server/services/concern-resolution-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await closeConcernResolution(await getCurrentUser(), id, await request.json().catch(() => null)));
  } catch (error) {
    return concernErrorResponse(error);
  }
}
