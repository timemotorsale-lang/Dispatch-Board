import { NextResponse } from "next/server";

import { concernErrorResponse } from "@/app/api/concerns/response";
import { getCurrentUser } from "@/server/auth/current-user";
import { createConcernResolutionPackage, listConcernResolutionPackages } from "@/server/services/concern-resolution-service";

export async function GET() {
  try {
    return NextResponse.json({ concerns: await listConcernResolutionPackages(await getCurrentUser()) });
  } catch (error) {
    return concernErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await createConcernResolutionPackage(await getCurrentUser(), await request.json().catch(() => null), request.headers.get("Idempotency-Key"));
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    return concernErrorResponse(error);
  }
}
