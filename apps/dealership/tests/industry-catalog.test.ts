import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("industry catalog", () => {
  it("merges industry makes across automobile categories and caches requests", async () => {
    const fetcher = vi.fn(async () => Response.json({ Results: [{ MakeId: 474, MakeName: "HONDA" }, { MakeId: 448, MakeName: "TOYOTA" }] }));
    vi.stubGlobal("fetch", fetcher);
    const { industryMakes } = await import("../src/server/industry-catalog");
    const first = await industryMakes();
    expect(first.map(make => make.name)).toEqual(["HONDA", "TOYOTA"]);
    await industryMakes();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith("https://vpic.nhtsa.dot.gov/api/vehicles/"))).toBe(true);
  });

  it("loads models by automobile category and rejects unrelated make rows", async () => {
    const fetcher = vi.fn(async (url: string) => Response.json({ Results: url.includes("GetMakes") ? [{ MakeId: 474, MakeName: "HONDA" }] : [{ Make_ID: 474, Model_Name: "Civic" }, { Make_ID: 474, Model_Name: "Accord" }, { Make_ID: 999, Model_Name: "Unrelated" }] }));
    vi.stubGlobal("fetch", fetcher);
    const { industryModels } = await import("../src/server/industry-catalog");
    expect((await industryModels([474])).map(model => model.name)).toEqual(["Accord", "Civic"]);
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("GetModels")).every(([url]) => String(url).includes("GetModelsForMakeIdYear/makeId/474/vehicletype/"))).toBe(true);
  });

  it("rejects invalid IDs before making any provider requests", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { GET } = await import("../src/app/api/vehicle-catalog/route");
    expect((await GET(new Request("https://preview.test/api/vehicle-catalog?makeId=../../private"))).status).toBe(400);
    expect((await GET(new Request(`https://preview.test/api/vehicle-catalog?${Array(21).fill("makeId=474").join("&")}`))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("provides an honest unavailable response without claiming the catalog is complete", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
    const { GET } = await import("../src/app/api/vehicle-catalog/route");
    const result = await GET(new Request("https://preview.test/api/vehicle-catalog"));
    expect(result.status).toBe(503);
    expect((await result.json()).error).toContain("Inventory options remain available");
  });
});
