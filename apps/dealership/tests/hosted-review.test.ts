import { afterEach, describe, expect, it, vi } from "vitest";
import { allowPreviewRequest } from "../src/server/preview-security";
import { previewEnabled } from "../src/lib/domain";

afterEach(() => vi.unstubAllEnvs());
const environment = { NODE_ENV: "production", DEALERSHIP_ENVIRONMENT: "private-review", DEALERSHIP_HOSTED_REVIEW: "1", DEALERSHIP_PREVIEW_DATA: "1", DEALERSHIP_REVIEW_KEY: "a".repeat(64), DEALERSHIP_REVIEW_ORIGIN: "https://staff.example.test" };

describe("hosted synthetic review", () => {
  it("keeps ordinary production preview disabled", () => {
    expect(previewEnabled({ NODE_ENV: "production", DEALERSHIP_PREVIEW_DATA: "1" })).toBe(false);
    expect(previewEnabled({ ...environment, DEALERSHIP_REVIEW_KEY: "" })).toBe(false);
    expect(previewEnabled(environment)).toBe(true);
  });
  it("rejects direct or incorrect gateway credentials", () => {
    expect(allowPreviewRequest(new Request("http://website-preview:3100/website-review"), environment)).toBe(false);
    expect(allowPreviewRequest(new Request("http://website-preview:3100/website-review", { headers: { "x-tms-review-key": "wrong" } }), environment)).toBe(false);
  });
  it("requires trusted gateway proof and the configured mutation origin", () => {
    const request = (origin: string) => new Request("http://website-preview:3100/website-review/api/preview", { method: "POST", headers: { "x-tms-review-key": environment.DEALERSHIP_REVIEW_KEY, origin } });
    expect(allowPreviewRequest(request(environment.DEALERSHIP_REVIEW_ORIGIN), environment, true)).toBe(true);
    expect(allowPreviewRequest(request("https://evil.example"), environment, true)).toBe(false);
  });
  it("prefixes browser assets and API requests only for hosted review", async () => {
    vi.stubEnv("NEXT_PUBLIC_REVIEW_BASE_PATH", "/website-review");
    vi.resetModules();
    const { publicPath } = await import("../src/lib/paths");
    expect(publicPath("/api/preview")).toBe("/website-review/api/preview");
    expect(publicPath("/brand/favicon-64.png")).toBe("/website-review/brand/favicon-64.png");
  });
});
