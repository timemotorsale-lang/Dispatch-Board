import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  presentUnifiedCrmQuote: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-quote-present-service", () => ({
  presentUnifiedCrmQuote: mocks.presentUnifiedCrmQuote
}));

import { POST } from "@/app/api/crm/v1/quotes/[quoteId]/present/route";

describe("Unified CRM quote present route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("maps held presentation to a typed 409 response", async () => {
    mocks.presentUnifiedCrmQuote.mockRejectedValue(
      Object.assign(new Error("Quote presentation is still governed and not available from this slice."), { code: "QUOTE_MUTATION_HELD" })
    );

    const response = await POST(new Request("http://crm.local", { method: "POST" }), { params: Promise.resolve({ quoteId: "quote-1" }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "QUOTE_MUTATION_HELD",
      error: "Quote presentation is still governed and not available from this slice."
    });
  });
});
