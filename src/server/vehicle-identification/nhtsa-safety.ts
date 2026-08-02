export type SafetyRelevance = "CONCERN_MATCH" | "SAFETY_REVIEW" | "BACKGROUND";

export type NhtsaRecallAdvisory = {
  campaignNumber: string;
  component: string;
  consequence: string | null;
  manufacturer: string | null;
  parkIt: boolean;
  parkOutside: boolean;
  remedy: string | null;
  relevance: SafetyRelevance;
  relevanceReasons: string[];
  reportReceivedDate: string | null;
  summary: string;
  verificationLabel: "Potentially applicable—verify by VIN";
};

export type NhtsaComplaintPattern = {
  component: string;
  count: number;
  relevance: SafetyRelevance;
  relevanceReasons: string[];
  sampleSummaries: string[];
};

export type NhtsaSafetyIntelligence = {
  complaints: NhtsaComplaintPattern[];
  concernEvaluated: string;
  manufacturerCommunications: {
    label: "Diagnostic guidance—not a recall";
    message: string;
    sourceUrl: string;
    status: "OFFICIAL_DATASET_SEARCH";
  };
  model: { make: string; model: string; year: number };
  recalls: NhtsaRecallAdvisory[];
  retrievedAt: string;
  sourcePolicy: {
    complaints: string;
    recalls: string;
    vinVerificationUrl: string;
  };
  warnings: string[];
};

type Fetcher = typeof fetch;
type Row = Record<string, unknown>;

const SAFETY_CATEGORIES = [
  { label: "Air bags / restraints", terms: ["airbag", "air bag", "srs", "restraint", "seat belt"] },
  { label: "Brakes", terms: ["brake", "braking", "abs", "hydraulic"] },
  { label: "Steering", terms: ["steer", "steering"] },
  { label: "Engine / power loss", terms: ["engine", "stall", "stalls", "power loss", "acceleration", "propulsion"] },
  { label: "Fuel", terms: ["fuel", "gasoline", "diesel", "pump", "leak"] },
  { label: "Electrical / fire", terms: ["electrical", "battery", "fire", "smoke", "burning", "short circuit"] },
  { label: "Visibility", terms: ["windshield", "wiper", "visibility", "camera", "lighting", "headlight"] },
  { label: "Tires / wheels", terms: ["tire", "wheel"] },
  { label: "Structure / latches", terms: ["door", "latch", "hood", "structure"] },
] as const;

function text(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function bool(row: Row, ...keys: string[]) {
  for (const key of keys) if (typeof row[key] === "boolean") return row[key] as boolean;
  return false;
}

function categories(value: string) {
  const normalized = value.toLocaleLowerCase();
  return SAFETY_CATEGORIES.filter((category) => category.terms.some((term) => normalized.includes(term))).map((category) => category.label);
}

function relevance(concern: string, evidence: string, fallback: SafetyRelevance) {
  const concernCategories = categories(concern);
  const evidenceCategories = categories(evidence);
  const matches = concernCategories.filter((category) => evidenceCategories.includes(category));
  return { relevance: matches.length ? "CONCERN_MATCH" as const : fallback, relevanceReasons: matches };
}

async function request(endpoint: string, fetcher: Fetcher) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    const response = await fetcher(endpoint, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`NHTSA returned HTTP ${response.status}.`);
    const payload = await response.json() as { results?: Row[]; Results?: Row[] };
    return payload.results ?? payload.Results ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function getNhtsaSafetyIntelligence(input: { concern?: string; fetcher?: Fetcher; make: string; model: string; now?: () => Date; year: number }): Promise<NhtsaSafetyIntelligence> {
  const year = Number(input.year);
  const make = input.make.trim();
  const model = input.model.trim();
  const concern = input.concern?.trim().slice(0, 2_000) ?? "";
  if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 2 || !make || !model) throw new Error("Year, make, and model are required for NHTSA safety intelligence.");

  const query = `make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
  const fetcher = input.fetcher ?? fetch;
  const settled = await Promise.allSettled([
    request(`https://api.nhtsa.gov/recalls/recallsByVehicle?${query}`, fetcher),
    request(`https://api.nhtsa.gov/complaints/complaintsByVehicle?${query}`, fetcher),
  ]);
  const warnings: string[] = [];
  const recallRows = settled[0].status === "fulfilled" ? settled[0].value : (warnings.push("Model-level recall campaigns are temporarily unavailable from NHTSA."), []);
  const complaintRows = settled[1].status === "fulfilled" ? settled[1].value : (warnings.push("NHTSA complaint reports are temporarily unavailable."), []);

  const recalls = recallRows.slice(0, 40).map((row): NhtsaRecallAdvisory | null => {
    const campaignNumber = text(row, "NHTSACampaignNumber", "nhtsaCampaignNumber");
    const summary = text(row, "Summary", "summary");
    if (!campaignNumber || !summary) return null;
    const component = text(row, "Component", "component") ?? "Component not reported";
    const match = relevance(concern, `${component} ${summary} ${text(row, "Consequence", "consequence") ?? ""}`, "SAFETY_REVIEW");
    return {
      campaignNumber, component, consequence: text(row, "Consequence", "consequence"), manufacturer: text(row, "Manufacturer", "manufacturer"),
      parkIt: bool(row, "parkIt"), parkOutside: bool(row, "parkOutSide", "parkOutside"), remedy: text(row, "Remedy", "remedy"),
      ...match, reportReceivedDate: text(row, "ReportReceivedDate", "reportReceivedDate"), summary,
      verificationLabel: "Potentially applicable—verify by VIN",
    };
  }).filter((item): item is NhtsaRecallAdvisory => Boolean(item)).sort((a, b) => Number(b.relevance === "CONCERN_MATCH") - Number(a.relevance === "CONCERN_MATCH") || Number(b.parkIt || b.parkOutside) - Number(a.parkIt || a.parkOutside));

  const complaintGroups = new Map<string, { count: number; samples: string[] }>();
  for (const row of complaintRows.slice(0, 500)) {
    const component = text(row, "components", "Components") ?? "Component not reported";
    const summary = text(row, "summary", "Summary");
    const group = complaintGroups.get(component) ?? { count: 0, samples: [] };
    group.count += 1;
    if (summary && group.samples.length < 2) group.samples.push(summary.slice(0, 500));
    complaintGroups.set(component, group);
  }
  const complaints = [...complaintGroups.entries()].map(([component, group]): NhtsaComplaintPattern => ({
    component, count: group.count, sampleSummaries: group.samples,
    ...relevance(concern, `${component} ${group.samples.join(" ")}`, "BACKGROUND"),
  })).sort((a, b) => Number(b.relevance === "CONCERN_MATCH") - Number(a.relevance === "CONCERN_MATCH") || b.count - a.count).slice(0, 12);

  return {
    complaints, concernEvaluated: concern,
    manufacturerCommunications: {
      label: "Diagnostic guidance—not a recall",
      message: "Review official manufacturer communications and service bulletins as diagnostic guidance. Applicability and repair procedures must be confirmed for this vehicle before use.",
      sourceUrl: "https://www.nhtsa.gov/nhtsa-datasets-and-apis",
      status: "OFFICIAL_DATASET_SEARCH",
    },
    model: { make, model, year }, recalls, retrievedAt: (input.now ?? (() => new Date()))().toISOString(),
    sourcePolicy: {
      complaints: "Background reports only—not a diagnosis or repair instruction.",
      recalls: "Model-level campaigns only. Never treated as an open VIN-specific recall.",
      vinVerificationUrl: "https://www.nhtsa.gov/recalls",
    }, warnings,
  };
}
