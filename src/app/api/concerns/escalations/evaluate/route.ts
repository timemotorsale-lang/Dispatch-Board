import { NextResponse } from "next/server";

import { concernErrorResponse } from "@/app/api/concerns/response";
import { getCurrentUser } from "@/server/auth/current-user";
import { evaluateConcernEscalations } from "@/server/services/concern-resolution-service";

export async function POST() {
  try {
    return NextResponse.json(await evaluateConcernEscalations(await getCurrentUser()));
  } catch (error) {
    return concernErrorResponse(error);
  }
}
