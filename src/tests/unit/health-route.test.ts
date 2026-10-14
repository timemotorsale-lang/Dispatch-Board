import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("@/server/db/client", () => ({ prisma: { $queryRaw: query } }));

import { GET } from "@/app/api/health/route";

describe("health route release verification", () => {
  beforeEach(() => {
    query.mockReset();
    vi.stubEnv("APP_RELEASE_SHA", "release-123");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("reports the running release when the database is healthy", async () => {
    query.mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok", revision: "release-123" });
  });

  it("keeps the release visible when the database is unavailable", async () => {
    query.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable", revision: "release-123" });
  });
});
