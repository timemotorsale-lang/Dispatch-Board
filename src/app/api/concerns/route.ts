import { NextResponse } from "next/server";

import { concernErrorResponse } from "@/app/api/concerns/response";
import { getCurrentUser } from "@/server/auth/current-user";
import { createConcernResolutionPackage, listConcernResolutionPackages } from "@/server/services/concern-resolution-service";
import { assertCrmFeatureEnabled } from "@/server/services/crm-rollout-service";

export async function GET() {
  try {
    const user = await getCurrentUser(); await assertCrmFeatureEnabled(user, "CRM_CASES");
    return NextResponse.json({ concerns: await listConcernResolutionPackages(user) });
  } catch (error) {
    return concernErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(); await assertCrmFeatureEnabled(user, "CRM_CASES");
    const result = await createConcernResolutionPackage(user, await request.json().catch(() => null), request.headers.get("Idempotency-Key"));
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    return concernErrorResponse(error);
  }
}
