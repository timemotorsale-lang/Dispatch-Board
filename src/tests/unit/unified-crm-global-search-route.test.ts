import { describe, expect, it, vi } from "vitest";

const actor = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const mocks = vi.hoisted(() => ({
  searchUnifiedCrm: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-global-search-service", () => ({
  searchUnifiedCrm: mocks.searchUnifiedCrm
}));

import { GET } from "@/app/api/crm/v1/search/route";

describe("Unified CRM global search route", () => {
  it("returns search results from the service", async () => {
    mocks.searchUnifiedCrm.mockResolvedValueOnce({
      contractVersion: "ucrm.global-search/v1",
      freshness: { newestRecordUpdatedAt: null, observedAt: "2026-08-26T12:00:00.000Z", status: "CURRENT" },
      generatedAt: "2026-08-26T12:00:00.000Z",
      groups: [],
      query: { limit: 12, q: "alex" },
      resultCount: 0,
      source: {
        authority: "UNIFIED_CRM",
        label: "Unified CRM global search",
        observedAt: "2026-08-26T12:00:00.000Z",
        readMode: "LIVE_CANONICAL"
      },
      state: "EMPTY",
      visibility: "organization"
    });

    const response = await GET(new Request("http://crm.local/api/crm/v1/search?q=alex&limit=12"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ contractVersion: "ucrm.global-search/v1", state: "EMPTY" });
    expect(mocks.searchUnifiedCrm).toHaveBeenCalledWith(actor, expect.any(URLSearchParams));
  });

  it("maps typed search errors safely", async () => {
    mocks.searchUnifiedCrm.mockRejectedValueOnce(Object.assign(new Error("Search needs between 2 and 80 characters."), {
      code: "INVALID_GLOBAL_SEARCH_QUERY",
      retryable: false
    }));

    const response = await GET(new Request("http://crm.local/api/crm/v1/search?q=a"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "INVALID_GLOBAL_SEARCH_QUERY",
      contractVersion: "ucrm.global-search-error/v1",
      error: "Search needs between 2 and 80 characters.",
      retryable: false
    });
  });
});
