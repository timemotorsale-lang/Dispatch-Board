import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { submitTimeCardAttestation } from "@/server/time-attendance";

export async function POST(request: Request) {
  try {
    const result = await submitTimeCardAttestation(
      await getCurrentUser(),
      await request.json().catch(() => null)
    );
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time card attestation failed.";
    const status = message === "Authentication required."
      ? 401
      : error instanceof EnterpriseCommandConflictError
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
