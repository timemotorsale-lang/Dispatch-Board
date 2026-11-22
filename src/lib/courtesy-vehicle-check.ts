export const courtesyCheckSubjectType = "COURTESY_VEHICLE_CHECK";
export const courtesyCheckCommandType = "SAVE_COURTESY_VEHICLE_CHECK";

export type FrontlineResult = "FAIL" | "REVIEW" | "PASS";
type FrontlineQcItem = { code: string; label: string; hint: string };
type FrontlineQcSection = { title: string; items: FrontlineQcItem[] };

export const frontlineQcSections: FrontlineQcSection[] = [
  { title: "Exterior & Body", items: [
    { code: "REPAIR_AREA_ALIGNMENT", label: "Repair area / panel alignment", hint: "Panels even and gaps consistent" },
    { code: "PAINT_FINISH", label: "Paint and finish", hint: "Color match and surface quality" },
    { code: "BUMPER_TRIM", label: "Bumpers, trim and moldings", hint: "Secure and undamaged" },
    { code: "BODY_OPENINGS", label: "Doors, hood and liftgate", hint: "Open, close and latch properly" },
    { code: "GLASS_MIRRORS_WIPERS", label: "Glass, mirrors and wipers", hint: "Clear, secure and operating" }
  ] },
  { title: "Tires, Wheels & Brakes", items: [
    { code: "TIRES", label: "Tire condition and tread", hint: "Adequate tread and even wear" },
    { code: "WHEELS_LUGS", label: "Wheel condition and lug security", hint: "No damage and lugs secured" },
    { code: "BRAKES", label: "Brake operation / warning lights", hint: "Firm pedal and no warning lights" }
  ] },
  { title: "Lights & Safety", items: [
    { code: "HEADLIGHTS_SIGNALS", label: "Headlights and signals", hint: "All exterior lights function" },
    { code: "BRAKE_REVERSE_LIGHTS", label: "Brake and reverse lights", hint: "All operate correctly" },
    { code: "SAFETY_EQUIPMENT", label: "Seat belts, horn and safety equipment", hint: "Present and functional" }
  ] },
  { title: "Interior & Controls", items: [
    { code: "DASH_WARNINGS", label: "Dash warning lights", hint: "No warning lights illuminated" },
    { code: "HVAC_ACCESSORIES", label: "HVAC and accessories", hint: "Heat, A/C, radio, windows and locks" },
    { code: "INTERIOR_CONDITION", label: "Seats, trim and cleanliness", hint: "Clean with no damage or stains" }
  ] },
  { title: "Mechanical & Road Check", items: [
    { code: "UNDERHOOD_LEAKS", label: "Fluid leaks / underhood check", hint: "No leaks and levels within range" },
    { code: "STEERING_SUSPENSION", label: "Steering and suspension", hint: "No noises; stable and centered" },
    { code: "ROAD_TEST", label: "Road-test operation", hint: "Shifts, brakes and acceleration operate properly" }
  ] },
  { title: "Frontline Presentation", items: [
    { code: "DETAIL_QUALITY", label: "Detail quality", hint: "Clean inside and out" },
    { code: "KEYS_DOCUMENTS", label: "Keys, manuals and documents", hint: "All keys, books and records accounted for" }
  ] }
];

export const frontlineQcItems = frontlineQcSections.flatMap(section => section.items);

export type CourtesyOutcome = "DISCUSSED" | "DEFERRED" | "REQUESTED_ESTIMATE";
export const courtesyOutcomes: Record<CourtesyOutcome, string> = {
  DISCUSSED: "Discussed",
  DEFERRED: "Deferred",
  REQUESTED_ESTIMATE: "Requested estimate",
};

export type CourtesyFinding = {
  code: string;
  result: FrontlineResult;
  note: string;
  evidence: string;
  followUp?: { outcome: CourtesyOutcome; note: string; actorName: string; recordedAt: string };
};

export type CourtesyCheck = {
  version: number;
  inspectedAt: string;
  inspectorName: string;
  findings: CourtesyFinding[];
};

const safetyItems = new Set(["TIRES", "WHEELS_LUGS", "BRAKES", "HEADLIGHTS_SIGNALS", "BRAKE_REVERSE_LIGHTS", "SAFETY_EQUIPMENT", "DASH_WARNINGS", "STEERING_SUSPENSION", "ROAD_TEST"]);

export function isCourtesySafetyFlag(finding: CourtesyFinding) {
  return finding.result === "FAIL" && safetyItems.has(finding.code);
}

export function courtesyFindingLabel(code: string) {
  return frontlineQcItems.find(item => item.code === code)?.label ?? code;
}
