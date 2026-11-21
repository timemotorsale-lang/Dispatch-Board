import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { submitStaffTimeOffRequest } from "@/server/time-attendance";
import { changeOwnTimeOffRequest } from "@/server/time-attendance/time-off-service";

async function save(request: Request, operation: typeof submitStaffTimeOffRequest | typeof changeOwnTimeOffRequest) {
  try {
    const result = await operation(
      await getCurrentUser(),
      await request.json().catch(() => null)
    );
    return NextResponse.json(result, { status: request.method === "PATCH" || result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
      return NextResponse.json({ error: "A request changed while saving. Retry or refresh your time off." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Time-off request failed.";
    const status = message === "Authentication required."
      ? 401
      : error instanceof EnterpriseCommandConflictError
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  return save(request, submitStaffTimeOffRequest);
}

export async function PATCH(request: Request) {
  return save(request, changeOwnTimeOffRequest);
}
