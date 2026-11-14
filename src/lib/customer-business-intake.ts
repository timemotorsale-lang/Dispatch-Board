export const BUSINESS_INTAKE_GROUPS = [
  { title: "Business details", fields: [
    ["tradeName", "Trade name"], ["enterpriseType", "Enterprise type"], ["businessType", "Type of business"],
    ["taxIdLast4", "Tax ID ending (last 4)"], ["yearsInBusiness", "Years in business"], ["monthlyIncome", "Monthly business income"],
    ["lengthAtAddress", "Time at business address"], ["premisesType", "Own / rent business premises"]
  ] },
  { title: "Principal", fields: [
    ["principalName", "Principal name"], ["principalTitle", "Job title"], ["ownershipPercent", "Ownership %"],
    ["principalPhone", "Principal phone"], ["principalAddress", "Principal address"]
  ] },
  { title: "Operator", fields: [["operatorName", "Operator name"], ["operatorAddress", "Operator address"], ["operatorPhone", "Operator phone"]] },
  { title: "Other signer", fields: [["signerName", "Other signer name"], ["signerEmail", "Other signer email"]] },
  { title: "Co-applicant", fields: [
    ["coApplicantRelationship", "Relationship"], ["coApplicantName", "Co-applicant name"], ["coApplicantPhone", "Co-applicant phone"],
    ["coApplicantEmail", "Co-applicant email"], ["coApplicantAddress", "Co-applicant address"]
  ] },
  { title: "Co-applicant employment", fields: [
    ["employerName", "Employer name"], ["lengthAtJob", "Time at job"], ["employmentStatus", "Employment status"],
    ["employmentAddress", "Employment address"], ["employmentPhone", "Employer phone"],
    ["incomeType", "Income type"], ["employmentMonthlyIncome", "Monthly income"]
  ] }
] as const;

export function businessIntakeNote(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const raw = value as Record<string, unknown>;
  const lines = ["Business customer intake"];
  for (const group of BUSINESS_INTAKE_GROUPS) {
    const entries: string[] = [];
    for (const [key, label] of group.fields) {
      if (raw[key] !== undefined && typeof raw[key] !== "string") throw new Error(`${label} must be text.`);
      const text = (raw[key] as string | undefined)?.trim() ?? "";
      if (text.length > 300) throw new Error(`${label} must be 300 characters or fewer.`);
      if (key === "taxIdLast4" && text && !/^\d{4}$/.test(text)) throw new Error("Enter only the last four digits of the tax ID.");
      if (key === "ownershipPercent" && text && (!/^\d+(\.\d{1,2})?$/.test(text) || Number(text) > 100)) throw new Error("Ownership percentage must be between 0 and 100.");
      if (text) entries.push(`${label}: ${text}`);
    }
    if (entries.length) lines.push(group.title, ...entries);
  }
  return lines.join("\n");
}
