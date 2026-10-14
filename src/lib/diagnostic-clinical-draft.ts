export type ClinicalForm = {
  mode: "observations" | "measurements" | "evidence";
  statement: string; conditions: string; quantity: string; value: string; unit: string; group: string;
  instrument: string; calibration: string; referenceMin: string; referenceMax: string; referenceSource: string;
  evidenceObjectId: string; purpose: string;
  pending?: { endpoint: string; body: Record<string, unknown> };
};
export type ClinicalDrafts = Record<string, ClinicalForm>;
export const emptyClinicalForm: ClinicalForm = { mode: "observations", statement: "", conditions: "", quantity: "DISTANCE", value: "", unit: "mm", group: "", instrument: "", calibration: "UNKNOWN", referenceMin: "", referenceMax: "", referenceSource: "", evidenceObjectId: "", purpose: "" };
