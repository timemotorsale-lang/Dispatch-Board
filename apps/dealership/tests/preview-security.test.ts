import { describe, expect, it } from "vitest";
import { allowPreviewRequest } from "../src/server/preview-security";

const development = { NODE_ENV: "development", DEALERSHIP_PREVIEW_DATA: "1" };
const request = (host: string, origin?: string) => new Request("http://localhost:3100/api/preview", { headers: { host, ...(origin ? { origin } : {}) } });

describe("loopback preview and CSRF boundary", () => {
  it("accepts an in-app browser's actual loopback Host/Origin despite internal URL normalization", () => {
    expect(allowPreviewRequest(request("127.0.0.1:3100", "http://127.0.0.1:3100"), development, true)).toBe(true);
  });
  it("rejects cross-origin mutations and missing origins", () => {
    expect(allowPreviewRequest(request("127.0.0.1:3100", "https://other.example"), development, true)).toBe(false);
    expect(allowPreviewRequest(request("127.0.0.1:3100"), development, true)).toBe(false);
  });
  it("rejects non-loopback hosts and all production preview access", () => {
    expect(allowPreviewRequest(request("dealership.example"), development)).toBe(false);
    expect(allowPreviewRequest(request("localhost:3100"), { ...development, NODE_ENV: "production" })).toBe(false);
  });
});
