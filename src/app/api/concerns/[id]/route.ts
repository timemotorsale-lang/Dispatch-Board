import { NextResponse } from "next/server";

import { concernErrorResponse } from "@/app/api/concerns/response";
import { getCurrentUser } from "@/server/auth/current-user";
import { getConcernResolutionPackage } from "@/server/services/concern-resolution-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await getConcernResolutionPackage(await getCurrentUser(), id));
  } catch (error) {
    return concernErrorResponse(error);
  }
}
