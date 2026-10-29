import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/sample-media/[image]/route";
import { isSamplePhoto, sampleMedia, samplePhoto } from "../src/lib/sample-media";

afterEach(() => vi.unstubAllEnvs());
describe("private sample vehicle photos", () => {
  it("has a bundled photo for every supported body style", async () => {
    for (const body of ["SUV", "Crossover", "Sedan", "Truck", "Coupe", "Convertible", "Hatchback", "Wagon", "Van", "Minivan"]) expect(isSamplePhoto(samplePhoto(body, "Gasoline"))).toBe(true);
    for (const media of Object.values(sampleMedia)) expect((await readFile(`fixtures/media/${media.file}`)).length).toBeGreaterThan(1000);
    expect(isSamplePhoto("/api/sample-media/../../private")).toBe(false);
  });
  it("serves only allowlisted preview assets and denies all of them in production", async () => {
    const request = new Request("http://localhost:3100/api/sample-media/sedan", { headers: { host: "127.0.0.1:3100" } });
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("DEALERSHIP_ENVIRONMENT", "development"); vi.stubEnv("DEALERSHIP_PREVIEW_DATA", "1");
    vi.stubEnv("DEALERSHIP_HOSTED_REVIEW", "0"); vi.stubEnv("DEALERSHIP_LISTINGS_PATH", "");
    const response = await GET(request, { params: Promise.resolve({ image: "sedan" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toContain("no-store");
    for (const image of ["constructor", "../../private", "not-present"]) expect((await GET(request, { params: Promise.resolve({ image }) })).status).toBe(404);
    vi.stubEnv("DEALERSHIP_ENVIRONMENT", "public-production"); vi.stubEnv("DEALERSHIP_PREVIEW_DATA", "0");
    for (const image of Object.keys(sampleMedia)) expect((await GET(request, { params: Promise.resolve({ image }) })).status).toBe(404);
  });
});
