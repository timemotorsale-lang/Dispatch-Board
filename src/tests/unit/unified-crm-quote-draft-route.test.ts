import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  saveUnifiedCrmQuoteDraft: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock("@/server/services/unified-crm-quote-draft-service", () => ({
  saveUnifiedCrmQuoteDraft: mocks.saveUnifiedCrmQuoteDraft
}));

import { POST as createDraft } from "@/app/api/crm/v1/quotes/route";
import { POST as reviseDraft } from "@/app/api/crm/v1/quotes/[quoteId]/draft/route";

describe("Unified CRM quote draft routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("returns 201 for a new quote draft and 200 for replay", async () => {
    mocks.saveUnifiedCrmQuoteDraft.mockResolvedValueOnce({
      contractVersion: "ucrm.quote-draft/v1",
      duplicate: false,
      quoteId: "quote-1",
      quoteNumber: "Q-1",
      versionNumber: 1
    });
    const created = await createDraft(new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }));
    expect(created.status).toBe(201);

    mocks.saveUnifiedCrmQuoteDraft.mockResolvedValueOnce({
      contractVersion: "ucrm.quote-draft/v1",
      duplicate: true,
      quoteId: "quote-1",
      quoteNumber: "Q-1",
      versionNumber: 1
    });
    const replay = await reviseDraft(new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ quoteId: "quote-1" }) });
    expect(replay.status).toBe(200);
  });

  it("maps invalid, unavailable, stale, and hidden quote states safely", async () => {
    mocks.saveUnifiedCrmQuoteDraft.mockRejectedValueOnce(Object.assign(new Error("bad"), { code: "INVALID_QUOTE_COMMAND" }));
    expect((await createDraft(new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }))).status).toBe(400);

    mocks.saveUnifiedCrmQuoteDraft.mockRejectedValueOnce(Object.assign(new Error("hidden"), { code: "QUOTE_NOT_AVAILABLE" }));
    expect((await reviseDraft(new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ quoteId: "quote-1" }) })).status).toBe(404);

    mocks.saveUnifiedCrmQuoteDraft.mockRejectedValueOnce(Object.assign(new Error("stale"), { code: "QUOTE_VERSION_CONFLICT" }));
    expect((await reviseDraft(new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ quoteId: "quote-1" }) })).status).toBe(409);

    mocks.saveUnifiedCrmQuoteDraft.mockRejectedValueOnce(Object.assign(new Error("down"), { code: "QUOTE_SOURCE_UNAVAILABLE" }));
    expect((await createDraft(new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }))).status).toBe(503);
  });

  it("masks unexpected route failures", async () => {
    mocks.saveUnifiedCrmQuoteDraft.mockRejectedValue(new Error("private storage detail"));
    const response = await createDraft(new Request("http://crm.local", { method: "POST", body: JSON.stringify({}) }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Quote draft could not be saved right now."
    });
  });
});
