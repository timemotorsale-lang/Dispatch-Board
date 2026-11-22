export const reconRepairPathOptions = [
  { value: "MECHANICAL", label: "Mechanical repair", detail: "Diagnose the concern, then estimate, repair, and check the work." },
  { value: "BODYWORK", label: "Bodywork", detail: "Document visible damage and prepare the bodywork scope." },
  { value: "OUTSIDE_VENDOR", label: "Outside vendor", detail: "Plan the vendor handoff, estimate, approval, and return." },
  { value: "DETAIL_PREP", label: "Detail / prep", detail: "Plan cleaning, detailing, and frontline preparation." },
  { value: "INSPECTION_ONLY", label: "Inspection only", detail: "Verify the condition and document the inspection outcome." },
] as const;

export type ReconRepairPath = typeof reconRepairPathOptions[number]["value"];

export function findReconRepairPath(value?: string) {
  return reconRepairPathOptions.find(option => option.value === value);
}
