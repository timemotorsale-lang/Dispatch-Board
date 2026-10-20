import { describe, expect, it } from "vitest";
import { moneyError, requireMoneyOrigin } from "@/server/money-resources/http";
import { MoneyError } from "@/lib/money-resources";

describe("money HTTP safeguards", () => {
  it("accepts the actual browser host behind the local app server", () => {
    expect(() => requireMoneyOrigin(new Request("http://localhost:3261/api/money-resources", { headers: { host: "127.0.0.1:3261", origin: "http://127.0.0.1:3261", "sec-fetch-site": "same-origin" } }))).not.toThrow();
  });
  it("rejects cross-site requests, mismatched ports and malformed origins", () => {
    for (const headers of [{ origin: "https://untrusted.example" }, { origin: "http://localhost:3001" }, { origin: "null" }, { "sec-fetch-site": "cross-site" }]) {
      expect(() => requireMoneyOrigin(new Request("http://localhost:3000/api/money-resources", { headers }))).toThrow(MoneyError);
    }
  });
  it("returns actionable domain failures without exposing database errors", async () => {
    const denied = moneyError(new MoneyError("Manager review required.", 403));
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ error: "Manager review required." });
    const failed = moneyError(new Error("private database query detail"));
    expect(failed.status).toBe(503);
    expect(failed.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(await failed.json())).not.toContain("private database");
  });
});
