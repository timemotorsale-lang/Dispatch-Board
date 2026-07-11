import { NextResponse } from "next/server";

export function concernErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to process the concern right now.";
  const status = message === "Authentication required." ? 401
    : message === "Manager access required." ? 403
    : message === "Concern not found." ? 404
    : message.includes("Idempotency-Key was already used") ? 409
    : message.startsWith("Concern ") || message.includes(" is required") || message.includes("cannot close") ? 400
    : 500;
  return NextResponse.json({ error: message }, { status });
}
