import type { LaborOperationSystem, LaborRepairOperation } from "./labor-operation-taxonomy";

export const LABOR_LANGUAGE_INTELLIGENCE_VERSION = "DGN-LI/1.0.0";

export type LaborLanguageIntent =
  | "REQUESTED_REPAIR"
  | "CUSTOMER_CONCERN"
  | "INSPECTION_FINDING"
  | "SYSTEM_BROWSE"
  | "UNKNOWN";

export type LaborLanguageConfidence = "HIGH" | "MEDIUM" | "LOW" | "ABSTAIN";

export type LaborLanguageCandidate = {
  confidence: Exclude<LaborLanguageConfidence, "ABSTAIN">;
  operation: LaborRepairOperation;
  reasons: string[];
  score: number;
};

export type LaborLanguageAnalysis = {
  candidates: LaborLanguageCandidate[];
  clarification: string | null;
  confidence: LaborLanguageConfidence;
  detectedActions: string[];
  detectedSystems: Array<{ id: string; title: string }>;
  intent: LaborLanguageIntent;
  normalizedText: string;
  recognizedTerms: string[];
  summary: string;
  version: typeof LABOR_LANGUAGE_INTELLIGENCE_VERSION;
};

type IndexedOperation = {
  operation: LaborRepairOperation;
  fields: Array<{ label: string; phrases: string[]; tokens: string[]; weight: number }>;
  phrases: string[];
  tokens: string[];
};

const ignoredWords = new Set([
  "a", "an", "and", "are", "at", "be", "can", "car", "check", "customer", "feel", "for", "from", "has", "have",
  "i", "in", "is", "it", "my", "need", "needs", "of", "on", "or", "please", "repair", "says", "states",
  "that", "the", "this", "to", "vehicle", "want", "with"
]);

const concernWords = new Set([
  "bad", "broke", "broken", "concern", "concerns", "fault", "faults", "issue", "issues", "problem", "problems",
  "trouble", "wrong"
]);

const inspectionMarkers = [
  "found", "observed", "inspection found", "inspection shows", "inspected", "measured", "noted", "technician found",
  "worn", "cracked", "damaged", "failed inspection"
];

const actionAliases: Record<string, string[]> = {
  ADJUST: ["adjust", "adjustment"],
  CALIBRATE: ["calibrate", "calibration", "program", "programming", "relearn"],
  DIAGNOSE: ["diagnose", "diagnosis", "diagnostic", "troubleshoot", "troubleshooting"],
  INSPECT: ["inspect", "inspection", "check"],
  MEASURE: ["measure", "measurement", "test", "testing"],
  REPAIR: ["fix", "repair", "rebuild", "reseal"],
  REPLACE: ["install", "r&i", "remove and install", "replace", "replacement", "swap"],
  SERVICE: ["flush", "maintenance", "service", "tune up", "tune-up"]
};

const conceptAliases: Record<string, string[]> = {
  "a/c": ["ac", "air conditioning"],
  axle: ["cv axle", "half shaft"],
  battery: ["battery", "dead battery"],
  brakes: ["brake", "brakes", "abs", "antilock"],
  charging: ["battery light", "charge", "charging", "not charging"],
  coolant: ["antifreeze", "coolant"],
  engine: ["engine", "motor"],
  gearbox: ["gear box", "gearbox", "trans", "transaxle", "transmission"],
  leak: ["leak", "leaking", "seep", "seeping"],
  misfire: ["misfire", "missing", "rough running"],
  noise: ["click", "clicking", "clunk", "clunking", "grind", "grinding", "humming", "noise", "rattle", "rattling", "squeal"],
  overheat: ["hot", "overheat", "overheating", "runs hot"],
  shifting: ["hard shift", "harsh shift", "shift", "shifting", "slip", "slipping"],
  steering: ["power steering", "steer", "steering"],
  suspension: ["ride", "shock", "strut", "suspension"],
  vibration: ["shake", "shakes", "shaking", "vibrate", "vibrating", "vibration"]
};

const systemAliases: Record<string, string[]> = {
  "body-collision": ["body", "collision", "dent", "glass", "paint", "refinish", "windshield"],
  brakes: ["abs", "brake", "brakes", "parking brake", "stability control"],
  cooling: ["coolant", "cooling", "overheat", "overheating", "radiator", "thermostat", "water pump"],
  "electrical-adas": ["adas", "camera", "electrical", "electronics", "module", "radar", "wiring"],
  engine: ["engine", "engine performance", "motor"],
  "exhaust-emissions": ["catalyst", "emissions", "evap", "exhaust", "muffler"],
  "hybrid-ev": ["electric vehicle", "ev", "high voltage", "hybrid"],
  hvac: ["a/c", "ac", "air conditioning", "climate", "heat", "heater", "hvac"],
  maintenance: ["maintenance", "scheduled service", "tune up", "tune-up"],
  "starting-charging": ["alternator", "battery", "charging", "no crank", "starter", "starting"],
  "steering-suspension": ["alignment", "ride", "steering", "strut", "suspension"],
  "transmission-drivetrain": ["axle", "differential", "driveline", "drivetrain", "gearbox", "trans", "transaxle", "transmission"]
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9/+'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(token: string) {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ses") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) return token.slice(0, -1);
  return token;
}

const canonicalConcepts = new Map(Object.entries(conceptAliases).flatMap(([concept, aliases]) => [concept, ...aliases.map(normalize)].map(alias => [alias, concept] as const)));

function canonicalToken(token: string) {
  const singular = singularize(token);
  return canonicalConcepts.get(singular) ?? singular;
}

function tokenize(value: string, options: { retainConcernWords?: boolean } = {}) {
  return normalize(value)
    .split(" ")
    .map(canonicalToken)
    .filter((token) => token.length > 1 && !ignoredWords.has(token) && (options.retainConcernWords || !concernWords.has(token)));
}

function includesPhrase(text: string, phrase: string) {
  const normalizedPhrase = normalize(phrase);
  return normalizedPhrase.length > 0 && ` ${text} `.includes(` ${normalizedPhrase} `);
}

function editDistance(left: string, right: string) {
  if (left === right) return 0;
  const prior = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        prior[rightIndex] + 1,
        prior[rightIndex - 1] + Number(left[leftIndex - 1] !== right[rightIndex - 1])
      );
    }
    prior.splice(0, prior.length, ...current);
  }
  return prior[right.length];
}

function tokenSimilarity(query: string, candidate: string) {
  if (query === candidate) return 1;
  if (query.length >= 4 && candidate.length >= 4 && (query.startsWith(candidate) || candidate.startsWith(query))) return 0.86;
  const maximumDistance = Math.min(query.length, candidate.length) >= 8 ? 2 : Math.min(query.length, candidate.length) >= 5 ? 1 : 0;
  if (!maximumDistance || Math.abs(query.length - candidate.length) > maximumDistance) return 0;
  const distance = editDistance(query, candidate);
  return distance <= maximumDistance ? 0.78 - (distance - 1) * 0.08 : 0;
}

function operationAction(operation: LaborRepairOperation) {
  if (operation.operation === "Program / Calibrate") return "CALIBRATE";
  return operation.operation.toLocaleUpperCase();
}

function operationIndex(operation: LaborRepairOperation): IndexedOperation {
  const fields = [
    { label: "title", phrases: [operation.title], weight: 6 },
    { label: "alias", phrases: operation.aliases, weight: 7 },
    { label: "component", phrases: [operation.component], weight: 6 },
    { label: "concern", phrases: operation.concernExamples, weight: 5 },
    { label: "subsystem", phrases: [operation.subsystem], weight: 3 },
    { label: "system", phrases: [operation.system], weight: 2 },
    { label: "included work", phrases: operation.included, weight: 1.5 },
    { label: "position", phrases: [operation.position], weight: 1 }
  ].map((field) => ({ ...field, phrases: field.phrases.map(normalize), tokens: tokenize(field.phrases.join(" ")) }));
  return {
    operation,
    fields,
    phrases: fields.flatMap((field) => field.phrases),
    tokens: [...new Set(fields.flatMap((field) => field.tokens))]
  };
}

function detectActions(text: string) {
  return Object.entries(actionAliases)
    .filter(([, aliases]) => aliases.some((alias) => includesPhrase(text, alias)))
    .map(([action]) => action);
}

function detectSystems(text: string, taxonomy: LaborOperationSystem[]) {
  const rawTokens = normalize(text).split(" ").filter(Boolean);
  return taxonomy
    .filter((system) => {
      const aliases = [system.title, system.id.replaceAll("-", " "), ...(systemAliases[system.id] ?? [])];
      return aliases.some((alias) => {
        if (includesPhrase(text, alias)) return true;
        const aliasTokens = normalize(alias).split(" ").filter(Boolean);
        return aliasTokens.length === 1 && aliasTokens[0].length >= 5 && rawTokens.some((token) => tokenSimilarity(token, aliasTokens[0]) >= 0.7);
      });
    })
    .map((system) => ({ id: system.id, title: system.title }));
}

function classifyIntent(text: string, actions: string[], systems: Array<{ id: string; title: string }>, queryTokens: string[]) {
  if (!text) return "UNKNOWN" as const;
  if (inspectionMarkers.some((marker) => includesPhrase(text, marker))) return "INSPECTION_FINDING" as const;
  if (actions.some((action) => ["REPLACE", "REPAIR", "SERVICE", "ADJUST", "CALIBRATE"].includes(action))) return "REQUESTED_REPAIR" as const;
  const systemTokens = new Set(systems.flatMap((system) => tokenize([system.title, ...(systemAliases[system.id] ?? [])].join(" "))));
  const nonSystemTokens = queryTokens.filter((token) => !systemTokens.has(token));
  if (systems.length && !actions.length && nonSystemTokens.length === 0 && ![...concernWords].some((word) => includesPhrase(text, word))) return "SYSTEM_BROWSE" as const;
  return "CUSTOMER_CONCERN" as const;
}

function confidenceFor(score: number, intent: LaborLanguageIntent, exactPhrase: boolean): Exclude<LaborLanguageConfidence, "ABSTAIN"> {
  if (exactPhrase && intent === "REQUESTED_REPAIR") return "HIGH";
  if (score >= 45) return "HIGH";
  if (score >= 20) return "MEDIUM";
  return "LOW";
}

function summaryFor(intent: LaborLanguageIntent, systems: Array<{ id: string; title: string }>, confidence: LaborLanguageConfidence) {
  const system = systems.map((item) => item.title).join(" and ");
  if (intent === "REQUESTED_REPAIR") return `Requested repair recognized${system ? ` in ${system}` : ""}; ranked labor candidates are ready for advisor review.`;
  if (intent === "INSPECTION_FINDING") return `Inspection finding recognized${system ? ` in ${system}` : ""}; repair candidates remain reviewable rather than automatically accepted.`;
  if (intent === "SYSTEM_BROWSE") return `${system || "Repair"} category recognized; showing governed operations without assuming a failed component.`;
  if (intent === "CUSTOMER_CONCERN") return `Customer concern recognized${system ? ` in ${system}` : ""}; diagnostic starting points are preferred over unproven replacement work.`;
  return confidence === "ABSTAIN"
    ? "The description did not map reliably to the governed labor taxonomy."
    : "Possible labor candidates were found for advisor review.";
}

export function analyzeLaborLanguage(
  input: string,
  taxonomy: LaborOperationSystem[],
  options: { maximumCandidates?: number } = {}
): LaborLanguageAnalysis {
  const normalizedText = normalize(input);
  if (!normalizedText) {
    return {
      candidates: [],
      clarification: "Describe a repair request, customer concern, inspection finding, system, component, or symptom.",
      confidence: "ABSTAIN",
      detectedActions: [],
      detectedSystems: [],
      intent: "UNKNOWN",
      normalizedText,
      recognizedTerms: [],
      summary: "No description has been analyzed.",
      version: LABOR_LANGUAGE_INTELLIGENCE_VERSION
    };
  }

  const detectedActions = detectActions(normalizedText);
  const detectedSystems = detectSystems(normalizedText, taxonomy);
  const queryTokens = [...new Set(tokenize(normalizedText))];
  const intent = classifyIntent(normalizedText, detectedActions, detectedSystems, queryTokens);
  const indexed = taxonomy.flatMap((system) => system.groups.flatMap((group) => group.operations.map(operationIndex)));
  const systemByOperation = new Map(taxonomy.flatMap(system => system.groups.flatMap(group => group.operations.map(operation => [operation.id, system.id] as const))));
  const documentFrequency = new Map<string, number>();
  for (const entry of indexed) for (const token of entry.tokens) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);

  const ranked = indexed.map((entry) => {
    const operationSystemId = systemByOperation.get(entry.operation.id);
    const reasons = new Set<string>();
    let score = 0;
    let exactPhrase = false;

    for (const phrase of entry.phrases) {
      if (phrase.length >= 3 && includesPhrase(normalizedText, phrase)) {
        const field = entry.fields.find((candidate) => candidate.phrases.includes(phrase));
        score += (field?.weight ?? 1) * 3;
        exactPhrase = true;
        reasons.add(`Matched ${field?.label ?? "catalog"} phrase “${phrase}”`);
      }
    }

    for (const queryToken of queryTokens) {
      let strongest = 0;
      let strongestField = "";
      for (const field of entry.fields) {
        const similarity = Math.max(0, ...field.tokens.map((candidate) => tokenSimilarity(queryToken, candidate)));
        const weighted = similarity * field.weight;
        if (weighted > strongest) {
          strongest = weighted;
          strongestField = field.label;
        }
      }
      if (strongest > 0) {
        const frequency = documentFrequency.get(queryToken) ?? 1;
        const inverseFrequency = Math.log(1 + (indexed.length + 1) / (frequency + 1));
        score += strongest * inverseFrequency;
        if (strongest >= 3) reasons.add(`Matched ${strongestField} term “${queryToken}”`);
      }
    }

    if (detectedSystems.some((system) => system.id === operationSystemId)) {
      score += intent === "SYSTEM_BROWSE" ? 18 : 10;
      reasons.add(`Matched ${entry.operation.system} system`);
    }

    const expectedAction = operationAction(entry.operation);
    if (detectedActions.includes(expectedAction)) {
      score += 22;
      reasons.add(`Matched ${entry.operation.operation.toLocaleLowerCase()} intent`);
    } else if (score > 0 && intent === "CUSTOMER_CONCERN" && ["DIAGNOSE", "INSPECT", "MEASURE"].includes(expectedAction)) {
      score += 20;
      reasons.add("Preferred diagnostic work for a customer concern");
    } else if (intent === "SYSTEM_BROWSE" && ["REPLACE", "REPAIR"].includes(expectedAction)) {
      score -= 3;
    } else if (intent === "CUSTOMER_CONCERN" && detectedActions.length === 0 && expectedAction === "REPLACE") {
      score -= 8;
    }

    return { entry, exactPhrase, reasons: [...reasons], score: Math.max(0, Number(score.toFixed(3))) };
  });

  const recognizedSystems = new Set(detectedSystems.map((system) => system.id));
  let eligible = ranked.filter((item) => item.score > 0);
  if (recognizedSystems.size) {
    const inSystem = eligible.filter((item) => recognizedSystems.has(systemByOperation.get(item.entry.operation.id) ?? ""));
    if (inSystem.length) eligible = inSystem;
  }
  const recognizedSystemTokens = new Set(
    detectedSystems.flatMap((system) => tokenize([system.title, ...(systemAliases[system.id] ?? [])].join(" ")))
  );
  const specificConcernTokens = queryTokens.filter(token => ![...recognizedSystemTokens].some(systemToken => tokenSimilarity(token, systemToken) >= 0.7));
  if (intent === "CUSTOMER_CONCERN") eligible = eligible.filter(item => ["DIAGNOSE", "INSPECT", "MEASURE"].includes(operationAction(item.entry.operation)));
  if (intent === "CUSTOMER_CONCERN" && detectedSystems.length && specificConcernTokens.length === 0) {
    eligible = eligible.filter((item) => ["DIAGNOSE", "INSPECT", "MEASURE"].includes(operationAction(item.entry.operation)));
    const startingPoints: Record<string, string> = { engine: "engine-performance-diagnosis", "transmission-drivetrain": "transmission-concern-diagnosis" };
    const general = eligible.filter(item => detectedSystems.some(system => startingPoints[system.id] === item.entry.operation.id));
    if (general.length) eligible = general;
  }
  eligible.sort((left, right) => right.score - left.score || left.entry.operation.title.localeCompare(right.entry.operation.title));

  const maximumCandidates = options.maximumCandidates ?? 24;
  const candidates = eligible.slice(0, maximumCandidates).map((item) => ({
    confidence: confidenceFor(item.score, intent, item.exactPhrase),
    operation: item.entry.operation,
    reasons: item.reasons.slice(0, 4),
    score: item.score
  }));
  const topConfidence: LaborLanguageConfidence = candidates[0]?.confidence ?? "ABSTAIN";
  const recognizedTerms = [...new Set([
    ...detectedSystems.map((system) => system.title),
    ...detectedActions.map((action) => action.toLocaleLowerCase()),
    ...queryTokens.filter((token) => !concernWords.has(token))
  ])].slice(0, 12);

  const clarification =
    intent === "SYSTEM_BROWSE"
      ? `What symptom or work is needed in ${detectedSystems.map((system) => system.title).join(" and ")}?`
      : intent === "CUSTOMER_CONCERN" && detectedSystems.length && queryTokens.length <= detectedSystems.length + 1
        ? `Add a symptom, operating condition, warning, leak location, noise, or test finding for ${detectedSystems.map((system) => system.title).join(" and ")}.`
        : !candidates.length
          ? "No standard operation is reliable enough. Continue with a custom diagnostic investigation rather than forcing a repair classification."
          : topConfidence === "LOW"
            ? "Review the candidates or add the component, symptom, position, or requested action."
            : null;

  return {
    candidates,
    clarification,
    confidence: topConfidence,
    detectedActions,
    detectedSystems,
    intent,
    normalizedText,
    recognizedTerms,
    summary: summaryFor(intent, detectedSystems, topConfidence),
    version: LABOR_LANGUAGE_INTELLIGENCE_VERSION
  };
}
