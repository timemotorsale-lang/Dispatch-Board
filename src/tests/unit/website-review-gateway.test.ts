import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { reviewAccessStatus, reviewForwardHeaders, reviewRequestAllowed } from "@/server/website-review/gateway";
import { getWebsiteDestinations } from "@/features/website-console/destinations";

const manager: AuthenticatedUser = { id: "reviewer", name: "Reviewer", email: "reviewer@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const environment = { DEALERSHIP_HOSTED_REVIEW_ENABLED: "true", DEALERSHIP_REVIEW_KEY: "a".repeat(64), DEALERSHIP_REVIEW_ORIGIN: "https://staff.example.test" };
const { currentUser } = vi.hoisted(() => ({ currentUser: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: currentUser }));
import { GET, POST } from "@/app/website-review/[[...path]]/route";
import { NextRequest } from "next/server";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("private hosted website gateway", () => {
  it("requires an active authorized manager and explicit server configuration", () => {
    expect(reviewAccessStatus(null, environment)).toBe(401);
    expect(reviewAccessStatus({ ...manager, roles: ["Staff"] }, environment)).toBe(403);
    expect(reviewAccessStatus({ ...manager, isActive: false }, environment)).toBe(403);
    expect(reviewAccessStatus(manager, {})).toBe(503);
    expect(reviewAccessStatus(manager, environment)).toBe(200);
  });
  it("requires the configured HTTPS host and same-origin mutations", () => {
    const request = (origin: string, host = "staff.example.test") => new Request("http://localhost/website-review/api/preview", { method: "POST", headers: { host, origin } });
    expect(reviewRequestAllowed(request("https://staff.example.test"), environment)).toBe(true);
    expect(reviewRequestAllowed(request("https://evil.example"), environment)).toBe(false);
    expect(reviewRequestAllowed(request("https://staff.example.test", "evil.example"), environment)).toBe(false);
  });
  it("never forwards staff credentials or untrusted gateway headers", () => {
    const headers = reviewForwardHeaders(new Request("https://staff.example.test/website-review", { headers: { cookie: "dispatch-board-session=STAFF_SECRET; tms-preview=fixture-token", authorization: "Bearer STAFF_SECRET", "x-tms-review-key": "attacker", origin: "https://staff.example.test" } }), environment.DEALERSHIP_REVIEW_KEY);
    expect(headers.get("cookie")).toBe("tms-preview=fixture-token");
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-tms-review-key")).toBe(environment.DEALERSHIP_REVIEW_KEY);
    expect(headers.get("origin")).toBe(environment.DEALERSHIP_REVIEW_ORIGIN);
  });
  it("offers hosted review in production and retires it once a public domain is configured", () => {
    expect(getWebsiteDestinations({ NODE_ENV: "production", ...environment }).previewUrl).toBe("/website-review");
    expect(getWebsiteDestinations({ NODE_ENV: "production", ...environment, DEALERSHIP_PUBLIC_URL: "https://cars.example.com" }).previewUrl).toBeNull();
  });
  it("redirects an unsigned viewer to staff login without contacting the preview", async () => {
    currentUser.mockResolvedValue(null);
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const response = await GET(new NextRequest("https://staff.example.test/website-review/shop"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?returnTo=");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("denies unauthorized staff directly, including assets", async () => {
    currentUser.mockResolvedValue({ ...manager, roles: ["Staff"] });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await GET(new NextRequest("https://staff.example.test/website-review/_next/static/test.js"))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forwards a sample mutation only through the authenticated gateway", async () => {
    for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
    currentUser.mockResolvedValue(manager);
    const fetcher = vi.fn().mockResolvedValue(Response.json({ preview: true }));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(new NextRequest("https://staff.example.test/website-review/api/preview", { method: "POST", headers: { host: "staff.example.test", origin: "https://staff.example.test", "content-type": "application/json" }, body: "{}" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    expect(fetcher.mock.calls[0][0]).toBe("http://website-preview:3100/website-review/api/preview");
  });
});
