import { industryMakes, industryModels } from "../../../server/industry-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const values = new URL(request.url).searchParams.getAll("makeId");
  if (values.length > 20 || values.some(value => !/^[1-9][0-9]{0,6}$/.test(value))) return Response.json({ error: "Choose up to 20 valid makes to load models." }, { status: 400 });
  try {
    const data = values.length ? { models: await industryModels(Array.from(new Set(values.map(Number)))) } : { makes: await industryMakes() };
    return Response.json({ ...data, source: "NHTSA vPIC", scope: "Passenger cars, multipurpose passenger vehicles and trucks in the US-focused vPIC catalog; includes historical makes and models." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Industry catalog is temporarily unavailable. Inventory options remain available; please retry." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
