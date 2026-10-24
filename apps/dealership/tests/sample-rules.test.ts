import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { assertSamplePolicy, samplePolicy } from "../config/sample-policy.mjs";
import { projectSnapshot } from "../src/lib/domain";
import { getListings } from "../src/server/listings";
import { proxy } from "../src/proxy";
import { GET as media } from "../src/app/api/sample-media/rav4/route";
import { GET as account, POST as submit, DELETE as signOut } from "../src/app/api/preview/route";
import { store } from "../src/server/preview-store";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const privateReview = { NODE_ENV: "production", DEALERSHIP_ENVIRONMENT: "private-review", DEALERSHIP_HOSTED_REVIEW: "1", DEALERSHIP_PREVIEW_DATA: "1", DEALERSHIP_REVIEW_KEY: "a".repeat(64), DEALERSHIP_REVIEW_ORIGIN: "https://staff.example.test" };
const live = () => ({ schemaVersion: 1, dataMode: "LIVE", listings: [{ publication: "APPROVED", id: "unit-one", year: 2021, make: "Toyota", model: "RAV4", trim: "XLE", mileage: 78000, price: 19000, body: "SUV", drivetrain: "AWD", transmission: "Automatic", fuel: "Gasoline", availability: "AVAILABLE", photo: "/listing-media/unit-one.jpg", sourceVersion: 1, priceVersion: 1, observedAt: new Date(Date.now() - 1000).toISOString(), validUntil: new Date(Date.now() + 3600000).toISOString() }] });
function environment(values: Record<string, string>) {
  for (const key of ["DEALERSHIP_ENVIRONMENT", "DEALERSHIP_PREVIEW_DATA", "DEALERSHIP_HOSTED_REVIEW", "DEALERSHIP_LISTINGS_PATH", "DEALERSHIP_REVIEW_KEY", "DEALERSHIP_REVIEW_ORIGIN", "NEXT_PUBLIC_REVIEW_BASE_PATH"]) vi.stubEnv(key, "");
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
}

describe("explicit deployment and sample launch policy", () => {
  it("defaults unknown runtime to public, with samples disabled", () => {
    expect(samplePolicy({})).toMatchObject({ deployment: "public-production", enabled: false, error: null });
    expect(samplePolicy({ NODE_ENV: "development", DEALERSHIP_PREVIEW_DATA: "1" }).enabled).toBe(true);
    expect(samplePolicy(privateReview).enabled).toBe(true);
  });
  it.each([
    { DEALERSHIP_ENVIRONMENT: "public-production", DEALERSHIP_PREVIEW_DATA: "1", NODE_ENV: "development" },
    { ...privateReview, DEALERSHIP_ENVIRONMENT: "public-production" },
    { DEALERSHIP_ENVIRONMENT: "development", NODE_ENV: "production" },
    { DEALERSHIP_ENVIRONMENT: "unknown", NODE_ENV: "development" },
    { NODE_ENV: "development", DEALERSHIP_PREVIEW_DATA: "true" },
    { NODE_ENV: "production", NEXT_PUBLIC_REVIEW_BASE_PATH: "/website-review" },
    { ...privateReview, DEALERSHIP_REVIEW_KEY: "short" },
    { ...privateReview, DEALERSHIP_REVIEW_ORIGIN: "https://user:pass@staff.example.test" },
    { ...privateReview, DEALERSHIP_REVIEW_ORIGIN: "http://staff.example.test" },
    { ...privateReview, DEALERSHIP_LISTINGS_PATH: "live.json" }
  ])("fails launch closed for invalid or mixed configuration %#", values => {
    expect(samplePolicy(values).enabled).toBe(false);
    expect(() => assertSamplePolicy(values)).toThrow();
  });
});

describe("published feed provenance and no sample fallback", () => {
  it("requires LIVE provenance when loading published inventory", () => {
    const input = live();
    expect(projectSnapshot(input, new Date(), { requireLive: true })).toHaveLength(1);
    expect(() => projectSnapshot({ ...input, dataMode: undefined }, new Date(), { requireLive: true })).toThrow("LIVE provenance");
    expect(() => projectSnapshot({ ...input, dataMode: "SAMPLE" })).toThrow("Sample");
  });
  it.each([{ id: "sample-rav4" }, { sample: true }, { isSample: true }, { dataMode: "SAMPLE" }, { photo: "/api/sample-media/rav4" }, { photo: "/listing-media/sample-rav4.png" }])("rejects known sample markers from a LIVE snapshot %#", marker => {
    const input = live(); Object.assign(input.listings[0], marker);
    expect(() => projectSnapshot(input, new Date(), { requireLive: true })).toThrow("Sample");
  });
  it("never substitutes fixtures when the feed fails", async () => {
    environment({ NODE_ENV: "production", DEALERSHIP_ENVIRONMENT: "public-production", DEALERSHIP_LISTINGS_PATH: "approved-live.json" });
    const read = vi.spyOn(fs, "readFile").mockRejectedValue(new Error("missing"));
    expect(await getListings()).toMatchObject({ source: "UNAVAILABLE", listings: [] });
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith("approved-live.json", "utf8");
    read.mockResolvedValue(JSON.stringify({ ...live(), dataMode: "SAMPLE" }));
    expect(await getListings()).toMatchObject({ source: "UNAVAILABLE", listings: [] });
    read.mockResolvedValue(JSON.stringify(live()));
    expect(await getListings()).toMatchObject({ source: "PUBLISHED", listings: [{ id: "unit-one" }] });
  });
  it("keeps the sample fixture physically outside public media", async () => {
    expect(existsSync("public/listing-media/sample-rav4.png")).toBe(false);
    expect(existsSync("fixtures/media/sample-rav4.png")).toBe(true);
    environment({ NODE_ENV: "development", DEALERSHIP_ENVIRONMENT: "development", DEALERSHIP_PREVIEW_DATA: "1" });
    const snapshot = await getListings();
    expect(snapshot.source).toBe("PREVIEW");
    expect(snapshot.listings).toHaveLength(24);
    expect(snapshot.listings).toEqual(expect.arrayContaining([expect.objectContaining({ id: "sample-rav4" }), expect.objectContaining({ id: "sample-coming-soon" })]));
  });
});

describe("sample routes and storage stay isolated", () => {
  it("serves media only in an authorized, non-cacheable preview", async () => {
    environment({ NODE_ENV: "development", DEALERSHIP_PREVIEW_DATA: "1" });
    const request = new Request("http://localhost:3100/api/sample-media/rav4", { headers: { host: "127.0.0.1:3100" } });
    const response = await media(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    environment({ NODE_ENV: "production", DEALERSHIP_ENVIRONMENT: "public-production" });
    expect((await media(request)).status).toBe(404);
    expect(() => store()).toThrow("disabled");
    const api = new NextRequest("https://cars.example.test/api/preview");
    expect((await account(api)).status).toBe(503);
    expect((await submit(api)).status).toBe(503);
    expect((await signOut(api)).status).toBe(403);
  });
  it("rejects direct preview hosts and public misconfiguration before rendering", () => {
    environment({ NODE_ENV: "development", DEALERSHIP_PREVIEW_DATA: "1" });
    expect(proxy(new NextRequest("http://external.example.test/", { headers: { host: "external.example.test" } })).status).toBe(403);
    environment({ NODE_ENV: "production", DEALERSHIP_PREVIEW_DATA: "1" });
    expect(proxy(new NextRequest("https://cars.example.test/" )).status).toBe(503);
    environment(privateReview);
    expect(proxy(new NextRequest("http://preview:3100/website-review" )).status).toBe(403);
    const allowed = proxy(new NextRequest("http://preview:3100/website-review", { headers: { "x-tms-review-key": privateReview.DEALERSHIP_REVIEW_KEY } }));
    expect(allowed.headers.get("x-robots-tag")).toContain("noindex");
  });
});
