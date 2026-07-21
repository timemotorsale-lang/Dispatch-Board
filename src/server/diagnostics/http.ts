import { NextResponse } from "next/server";

import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { DiagnosticCaseDuplicateError } from "./domain";

export function diagnosticHttpFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "Diagnostic case request failed.";
  const status = message === "Authentication required."
    ? 401
    : message === "Diagnostic case was not found." || message === "An open repair order was not found for this diagnostic case."
      ? 404
      : message.startsWith("Vehicle capability required") || message.startsWith("Diagnostic case transition requires") || message.startsWith("Diagnostic case mutations are not enabled")
        ? 403
        : error instanceof EnterpriseCommandConflictError || error instanceof DiagnosticCaseDuplicateError
          ? 409
          : 400;
  return NextResponse.json({ error: message }, { status });
}
