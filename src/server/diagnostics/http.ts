import { NextResponse } from "next/server";

import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { DiagnosticCaseDuplicateError } from "./domain";

export function diagnosticHttpFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "Diagnostic case request failed.";
  const status = message === "Authentication required."
    ? 401
    : message === "Diagnostic case was not found." || message === "An open repair order was not found for this diagnostic case." || message === "Vehicle Evidence object was not found."
      ? 404
      : message.startsWith("Vehicle capability required") || message.startsWith("Diagnostic case transition requires") || message.startsWith("Diagnostic repair handoff requires") || message.startsWith("Diagnostic test-definition management requires") || message.startsWith("Diagnostic case mutations are not enabled") || message.startsWith("Diagnostic evidence mutations are not enabled") || message.startsWith("Diagnostic reasoning mutations are not enabled") || message.startsWith("Diagnostic publishing mutations are not enabled")
        ? 403
        : error instanceof EnterpriseCommandConflictError || error instanceof DiagnosticCaseDuplicateError
          ? 409
          : 400;
  return NextResponse.json({ error: message }, { status });
}
