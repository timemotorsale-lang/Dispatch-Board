export type PacketCorrection = { fields: string[]; sections: string[] };

export function packetCorrection(message: string): PacketCorrection | null {
  const value = message.toLowerCase();
  if (/delivery.*odometer|delivery.*mileage/.test(value)) return { fields: ["Delivery odometer", "Odometer"], sections: ["vehicle", "unit"] };
  if (/delivery.*date|warranty delivery/.test(value)) return { fields: ["Delivery date / time (local)"], sections: ["vehicle", "unit"] };
  if (/customer selected|select the driver|driver selected/.test(value)) return { fields: ["Customer", "Driver", "Buyer"], sections: ["applicant", "buyer", "renter", "driver"] };
  if (/vin|vehicle assigned|unit assigned/.test(value)) return { fields: ["VIN", "Search inventory", "Vehicle"], sections: ["vehicle", "unit"] };
  if (/applicant facts|buyer authority/.test(value)) return { fields: [], sections: ["applicant", "buyer"] };
  if (/interested vehicle/.test(value)) return { fields: ["Interested vehicle"], sections: ["unit", "vehicle"] };
  if (/payment hold/.test(value)) return { fields: ["Card last 4"], sections: ["protection"] };
  if (/next payment|payment date|lease.*date/.test(value)) return { fields: ["Next payment date", "First payment date", "Lease date"], sections: ["calculator", "terms"] };
  if (/license expiration|license must be current/.test(value)) return { fields: ["License expiration"], sections: ["driver", "buyer", "renter"] };
  if (/license|driver contact|identity/.test(value)) return { fields: ["Driver license", "Driver license number", "License number", "ID number"], sections: ["driver", "buyer", "applicant", "renter"] };
  if (/authorizing|accompanying/.test(value)) return { fields: ["Authorizing employee", "Accompanying employee"], sections: ["driver"] };
  if (/insurance|coverage|protection/.test(value)) return { fields: ["Insurance status", "Protection choice", "Insurance carrier"], sections: ["protection", "vehicle", "driver"] };
  if (/references|proof and|income|residence/.test(value)) return { fields: ["Income proof", "Residence proof", "References"], sections: ["buyer", "applicant", "proof"] };
  if (/handoff|servicing/.test(value)) return { fields: [], sections: ["handoff", "servicing", "funding"] };
  if (/manager|review.*clear|approval/.test(value)) return { fields: [], sections: ["approval", "reviews"] };
  if (/paperwork|signed|documents recorded|forms|packet recorded|packet stored/.test(value)) return { fields: [], sections: ["paperwork", "contracts", "forms", "documents", "packet", "evidence"] };
  if (/evidence|photos/.test(value)) return { fields: [], sections: ["evidence", "photos"] };
  if (/checkout.*mileage|mileage allowance/.test(value)) return { fields: ["Checkout odometer", "Mileage allowance"], sections: ["vehicle", "unit"] };
  if (/approved route|checkout condition|fuel level/.test(value)) return { fields: ["Approved route", "Checkout condition", "Fuel out"], sections: ["vehicle", "unit"] };
  if (/departure|duration|return time|receiving|test-drive authorization/.test(value)) return { fields: ["Date", "Start time", "Time allowance (minutes)", "Departure date / time"], sections: ["vehicle", "window", "return", "receiving", "checkout", "driver"] };
  if (/terms|structure/.test(value)) return { fields: [], sections: ["calculator", "terms", "structure", "deal", "window"] };
  if (/funding|lender|stipulations/.test(value)) return { fields: [], sections: ["funding", "lender", "approval"] };
  if (/payment|terms|cost|multiplier|amount|price|tax|fee|term/.test(value)) return { fields: [], sections: ["calculator", "terms", "structure", "deal", "window"] };
  return null;
}

// Preserve an actionable response even when fetch or JSON parsing fails.
export async function requestContractPacket(init: RequestInit): Promise<Response> {
  try {
    const response = await fetch("/api/crm/v1/contract-packets", { ...init, signal: AbortSignal.timeout(120000) });
    const payload = await response.json();
    return Response.json(payload, { status: response.status });
  } catch {
    return Response.json({ error: "The connection to the document service was interrupted. The save outcome is not confirmed. Check Sales Documents before retrying." }, { status: 503 });
  }
}
