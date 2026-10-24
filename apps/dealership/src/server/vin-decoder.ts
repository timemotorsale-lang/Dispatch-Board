export function normalizeVin(value: unknown) {
  if (typeof value !== "string" || !/^[A-HJ-NPR-Z0-9]{17}$/.test(value.trim().toUpperCase())) throw new Error("Enter a complete 17-character VIN without I, O or Q.");
  return value.trim().toUpperCase();
}

export function projectDecodedVehicle(value: unknown) {
  const body = value as { Results?: Record<string, unknown>[] };
  if (!body || !Array.isArray(body.Results) || body.Results.length !== 1) throw new Error("Vehicle details unavailable. Enter them manually.");
  const row = body.Results[0];
  if (!row || typeof row !== "object") throw new Error("Vehicle details unavailable. Enter them manually.");
  const text = (key: string) => typeof row[key] === "string" && row[key].length <= 100 ? row[key].trim() : "";
  const year = text("ModelYear");
  if (!/^\d{4}$/.test(year) || Number(year) < 1886 || Number(year) > new Date().getFullYear() + 2 || !text("Make") || !text("Model")) throw new Error("VIN did not identify a complete vehicle. Review it or enter details manually.");
  return {
    vehicle: { year, make: text("Make"), model: text("Model"), trim: text("Trim"), transmission: text("TransmissionStyle"), drivetrain: text("DriveType"), engineSpec: [text("DisplacementL") && `${text("DisplacementL")} L`, text("EngineCylinders") && `${text("EngineCylinders")} cylinders`].filter(Boolean).join(" · ") },
    source: "NHTSA vPIC", partial: text("ErrorCode") !== "0", image: null,
    imageStatus: "Licensed vehicle photo catalog is not connected. Add your own photo or use the silhouette."
  };
}

export async function decodeVin(value: unknown) {
  const vin = normalizeVin(value);
  const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`, { signal: AbortSignal.timeout(10000), cache: "no-store", redirect: "error" });
  if (!response.ok) throw new Error("VIN service unavailable. Try again or enter details manually.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Vehicle details unavailable. Enter them manually.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      length += chunk.byteLength;
      if (length > 1000000) throw new Error("VIN response too large.");
      chunks.push(chunk);
    }
  } finally { await reader.cancel(); }
  const buffer = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  return projectDecodedVehicle(JSON.parse(new TextDecoder().decode(buffer)));
}
