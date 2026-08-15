import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmQuoteAccess } from "@/server/unified-crm/quote-access";
import { UnifiedCrmQuotePresentError } from "@/server/unified-crm/quote-present-command";

export async function presentUnifiedCrmQuote(
  actor: AuthenticatedUser | null,
  quoteId: string,
  dependencies: { mode?: unknown; nodeEnv?: string } = {}
) {
  try {
    await requireUnifiedCrmQuoteAccess(actor, dependencies);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "";
    if (
      code === "AUTHENTICATION_REQUIRED" ||
      code === "QUOTE_NOT_AUTHORIZED" ||
      code === "QUOTE_OFF" ||
      code === "ORGANIZATION_SCOPE_AMBIGUOUS" ||
      code === "ORGANIZATION_SCOPE_UNAVAILABLE"
    ) {
      throw new UnifiedCrmQuotePresentError(code, "Quote presentation is still governed and not available from this slice.");
    }
    throw error;
  }

  throw new UnifiedCrmQuotePresentError("QUOTE_MUTATION_HELD", `Quote ${quoteId} cannot be presented from this slice yet.`);
}
