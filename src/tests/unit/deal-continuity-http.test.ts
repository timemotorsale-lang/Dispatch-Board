import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { dealIdentityFailure } from "@/server/deal-continuity/http";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

describe("shared deal actionable errors", () => {
  it("does not expose database details or records", async () => {
    const response = dealIdentityFailure(new Prisma.PrismaClientKnownRequestError("PRIVATE_QUERY_DETAILS", { code: "P2021", clientVersion: "6" }));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("PRIVATE_QUERY_DETAILS");
  });
  it("preserves authentication and record-scope refusals", () => {
    expect(dealIdentityFailure(new SalesDocumentsError("Sign in", 401)).status).toBe(401);
    expect(dealIdentityFailure(new SalesDocumentsError("Outside authorized scope", 403)).status).toBe(403);
  });
  it("holds concurrent duplicate vehicle creation for existing-record selection", async () => {
    const response = dealIdentityFailure(new EnterpriseCommandConflictError("Find and select its existing record.", "VERSION_CONFLICT"));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "Find and select its existing record." });
  });
});
