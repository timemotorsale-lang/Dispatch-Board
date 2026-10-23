import { afterEach, describe, expect, it, vi } from "vitest";
import { isReviewReady, openReview } from "../scripts/open-review.mjs";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("review launcher safety", () => {
  it("recognizes only the expected synthetic-data preview", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ application: "tms-dealership-review", syntheticData: true })));
    expect(await isReviewReady()).toBe(true);
  });
  it.each([
    { application: "another-app", syntheticData: true },
    { application: "tms-dealership-review", syntheticData: false }
  ])("does not reuse an unrelated or live app", async (payload) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
    expect(await isReviewReady()).toBe(false);
  });
  it("handles a stopped server without claiming it is ready", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Connection refused")));
    expect(await isReviewReady()).toBe(false);
  });
  it("never starts a production server", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(openReview()).rejects.toThrow("local review, not production");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
