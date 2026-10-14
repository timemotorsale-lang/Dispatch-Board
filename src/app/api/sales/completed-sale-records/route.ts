import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { submitCompletedSaleRecord } from "@/server/sales/completed-sale-record-service";

function getCompletedSaleRecordErrorStatus(error: unknown, message: string) {
  if (error instanceof EnterpriseCommandConflictError) return 409;
  if (message === "Authentication required.") return 401;
  if (
    message.includes("is required.") ||
    message.includes("must be an object.") ||
    message.includes("must be a list of strings.") ||
    message.includes("must be a non-negative number.") ||
    message.includes("not supported by Sales Console") ||
    message.includes("Missing") ||
    message.includes("cannot complete")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  try {
    const payload = await request.json();
    const result = await submitCompletedSaleRecord(user, payload);

    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record completed sale.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getCompletedSaleRecordErrorStatus(error, message)
      }
    );
  }
}
