import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/preview-status/route";

afterEach(() => vi.unstubAllEnvs());

describe("local preview readiness", () => {
  it("identifies the local synthetic preview without exposing customer records", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEALERSHIP_PREVIEW_DATA", "1");
    const response = await GET(new Request("http://localhost:3100/api/preview-status", { headers: { host: "127.0.0.1:3100" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ application: "tms-dealership-review", syntheticData: true });
  });
  it.each([
    ["production", "1", "127.0.0.1:3100"],
    ["development", "0", "127.0.0.1:3100"],
    ["development", "1", "external.example.com"]
  ])("rejects %s with preview=%s and host=%s", async (mode, enabled, host) => {
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("DEALERSHIP_PREVIEW_DATA", enabled);
    const response = await GET(new Request("http://localhost:3100/api/preview-status", { headers: { host } }));
    expect(response.status).toBe(404);
  });
});
