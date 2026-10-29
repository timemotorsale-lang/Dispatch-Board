import type { CatalogMake, CatalogModel } from "../lib/industry-options";

const lifetime = 24 * 60 * 60 * 1000;
const vehicleTypes = ["passenger car", "multipurpose passenger vehicle (mpv)", "truck"];
const cached = new Map<string, { expires: number; data: Record<string, unknown>[] }>();
const pending = new Map<string, Promise<Record<string, unknown>[]>>();

async function rows(endpoint: string) {
  const saved = cached.get(endpoint);
  if (saved && saved.expires > Date.now()) return saved.data;
  const existing = pending.get(endpoint);
  if (existing) return existing;
  const request = (async () => {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/${endpoint}?format=json`, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!response.ok) throw new Error("Industry catalog temporarily unavailable.");
    const body = await response.text();
    if (body.length > 5_000_000) throw new Error("Industry catalog response is too large.");
    const data = JSON.parse(body);
    if (!Array.isArray(data.Results) || data.Results.length > 30000) throw new Error("Invalid industry catalog response.");
    const results = data.Results.filter((row: unknown) => row && typeof row === "object" && !Array.isArray(row)) as Record<string, unknown>[];
    if (cached.size >= 64) cached.delete(cached.keys().next().value!);
    cached.set(endpoint, { expires: Date.now() + lifetime, data: results });
    return results;
  })();
  pending.set(endpoint, request);
  try { return await request; } finally { pending.delete(endpoint); }
}

export async function industryMakes(): Promise<CatalogMake[]> {
  const groups = await Promise.all(vehicleTypes.map(type => rows(`GetMakesForVehicleType/${encodeURIComponent(type)}`)));
  const makes = new Map<number, CatalogMake>();
  for (const row of groups.flat()) {
    const id = Number(row.MakeId);
    if (Number.isSafeInteger(id) && id > 0 && typeof row.MakeName === "string" && row.MakeName.length <= 100) makes.set(id, { id, name: row.MakeName.trim() });
  }
  if (!makes.size) throw new Error("Industry catalog returned no makes.");
  return Array.from(makes.values()).sort((first, second) => first.name.localeCompare(second.name));
}

export async function industryModels(makeIds: number[]): Promise<CatalogModel[]> {
  const known = new Set((await industryMakes()).map(make => make.id));
  if (makeIds.some(id => !known.has(id))) throw new Error("Unknown industry make.");
  const groups = await Promise.all(makeIds.map(async id => {
    const models = (await Promise.all(vehicleTypes.map(type => rows(`GetModelsForMakeIdYear/makeId/${id}/vehicletype/${encodeURIComponent(type)}`)))).flat();
    return models.filter(row => Number(row.Make_ID) === id && typeof row.Model_Name === "string" && row.Model_Name.length <= 100).map(row => ({ makeId: id, name: String(row.Model_Name).trim() }));
  }));
  const unique = new Map(groups.flat().map(model => [`${model.makeId}:${model.name}`, model]));
  return Array.from(unique.values()).sort((first, second) => first.name.localeCompare(second.name));
}
