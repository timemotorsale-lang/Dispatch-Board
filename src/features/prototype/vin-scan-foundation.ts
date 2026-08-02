export type AuctionSource = "Manheim" | "ADESA" | "Unknown";
export type VinScanMode = "VIN scan" | "Auction windshield";
export type VinScanConfidence = "High" | "Medium" | "Low";

export type ParsedVinScan = {
  auctionLocation: string | null;
  auctionSource: AuctionSource;
  confidence: VinScanConfidence;
  lotNumber: string | null;
  mode: VinScanMode;
  notes: string[];
  rawVin: string | null;
  runNumber: string | null;
  stockNumber: string | null;
  vin: string | null;
};

export function normalizeVinScanText(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function deriveStockNumberFromVin(value: string | null | undefined) {
  const vin = value ? normalizeVinScanText(value) : "";
  return vin.length === 17 ? vin.slice(-6) : null;
}

function titleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

export function parseVinScanEvidence(value: string): ParsedVinScan {
  const normalized = value.trim().replace(/\s+/g, " ");
  const upper = normalized.toUpperCase();
  const vinMatch = upper.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
  const runMatch = upper.match(/\bRUN(?:\s*#|\s+NO\.?|\s+NUMBER)?\s*([A-Z0-9-]{1,10})\b/);
  const lotMatch = upper.match(/\bLOT(?:\s*#|\s+NO\.?|\s+NUMBER)?\s*([A-Z0-9-]{1,12})\b/);

  const hasManheim = /MANHEIM|MAPLE\s*GROVE|MINNEAPOLIS|NORTHSTAR|SHAKOPEE/.test(upper);
  const hasAdesa = /ADESA|DAYTON/.test(upper);
  const auctionSource: AuctionSource = hasManheim ? "Manheim" : hasAdesa ? "ADESA" : "Unknown";
  const mode: VinScanMode = hasManheim || hasAdesa || Boolean(runMatch) || Boolean(lotMatch) ? "Auction windshield" : "VIN scan";

  let auctionLocation: string | null = null;
  if (/MAPLE\s*GROVE|MINNEAPOLIS/.test(upper)) auctionLocation = "Manheim Minneapolis / Maple Grove";
  else if (/NORTHSTAR|SHAKOPEE/.test(upper)) auctionLocation = "Manheim Northstar / Shakopee";
  else if (/DAYTON/.test(upper)) auctionLocation = "ADESA Dayton";
  else if (auctionSource === "Manheim") auctionLocation = "Manheim auction";
  else if (auctionSource === "ADESA") auctionLocation = "ADESA auction";

  const vin = vinMatch ? normalizeVinScanText(vinMatch[0]) : null;
  const stockNumber = vin ? deriveStockNumberFromVin(vin) : null;

  const notes = [
    ...(vin ? [`VIN ${vin} captured from ${mode.toLowerCase()} evidence`] : ["No 17-character VIN was found in the captured text"]),
    ...(auctionSource !== "Unknown" ? [`Auction source recognized as ${auctionSource}`] : []),
    ...(auctionLocation ? [`Auction location recognized as ${auctionLocation}`] : []),
    ...(runMatch ? [`Run number ${runMatch[1]} captured`] : []),
    ...(lotMatch ? [`Lot number ${lotMatch[1]} captured`] : []),
  ];

  const confidence: VinScanConfidence = vin && auctionSource !== "Unknown"
    ? "High"
    : vin
      ? "Medium"
      : normalized
        ? "Low"
        : "Low";

  return {
    auctionLocation,
    auctionSource,
    confidence,
    lotNumber: lotMatch ? titleCase(lotMatch[1]) : null,
    mode,
    notes,
    rawVin: vinMatch ? vinMatch[0] : null,
    runNumber: runMatch ? titleCase(runMatch[1]) : null,
    stockNumber,
    vin,
  };
}

export function vinMatchesExpected(parsedVin: string | null, expectedVin: string) {
  if (!parsedVin) return false;
  return normalizeVinScanText(parsedVin) === normalizeVinScanText(expectedVin);
}
