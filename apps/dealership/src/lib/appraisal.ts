export const conditionGroups = [
  { key: "exterior", title: "Exterior damage", options: ["Scratches or chips", "Fading paint", "Dents or scrapes", "Rust", "Hail damage"] },
  { key: "interior", title: "Interior condition", options: ["Persistent odors", "Damaged panels", "Stains", "Seat rips or tears"] },
  { key: "technology", title: "Technology issues", options: ["Audio system", "Interior display", "Backup camera", "Safety sensors", "Missing equipment"] },
  { key: "engine", title: "Engine issues", options: ["Warning light", "Unusual noises", "Vibration", "Smoke or steam", "Other engine issue"] },
  { key: "mechanical", title: "Mechanical or electrical issues", options: ["Air conditioning", "Electrical or airbag warning", "Tires or TPMS", "Transmission", "Brakes or steering"] }
] as const;

export const appraisalChoices: Record<string, readonly string[]> = {
  windshield: ["No known damage", "Minor chips", "Major cracks", "Not sure"],
  modifications: ["None", "Modified", "Not sure"],
  drivable: ["Drivable", "Not drivable", "Not sure"],
  condition: ["Excellent", "Good", "Fair", "Needs repairs", "Not sure"],
  accidents: ["No known accidents", "1 accident", "2 or more", "Not sure"],
  smoked: ["No", "Yes", "Not sure"],
  tires: ["None", "1", "2", "3", "4", "Not sure"],
  keys: ["0", "1", "2 or more", "Not sure"],
  loan: ["Loan", "Lease", "Neither", "Not sure"],
  intent: ["Sell outright", "Trade toward a purchase", "Not sure"],
  contactMethod: ["Email", "Phone call"]
};

export const appraisalDetailKeys = ["appraisalVersion", "trim", "transmission", "drivetrain", "engineSpec", "color", "vehicleSource", "windshield", "modifications", "drivable", "accidents", "smoked", "tires", "keys", "zip", "contactMethod", ...conditionGroups.map(group => group.key)];

export function toggleCondition(current: string, choice: string) {
  if (["None known", "Not sure"].includes(choice)) return current === choice ? "" : choice;
  const selected = current.split("|").filter(value => value && !["None known", "Not sure"].includes(value));
  return (selected.includes(choice) ? selected.filter(value => value !== choice) : [...selected, choice]).join("|");
}

export function validateAppraisalStep(details: Record<string, string>, step: number) {
  if (step === 0) {
    if (!/^\d{4}$/.test(details.year || "") || Number(details.year) < 1886 || Number(details.year) > new Date().getFullYear() + 2 || !details.make?.trim() || !details.model?.trim()) return "Enter the vehicle year, make and model, then confirm the details.";
    if (details.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(details.vin)) return "Review the 17-character VIN, or clear it to continue manually.";
  }
  if (step === 1) {
    for (const group of conditionGroups) {
      const values = (details[group.key] || "").split("|");
      const allowed: readonly string[] = [...group.options, "None known", "Not sure"];
      if (values.some(value => !allowed.includes(value)) || new Set(values).size !== values.length || values.length > 1 && values.some(value => ["None known", "Not sure"].includes(value))) return `Review ${group.title.toLowerCase()}. Choose issues, None known, or Not sure.`;
    }
  }
  const required = step === 1 ? ["windshield", "modifications", "drivable", "condition"] : step === 2 ? ["accidents", "smoked", "tires", "keys"] : step === 4 ? ["loan", "intent", "contactMethod"] : [];
  for (const key of required) if (!appraisalChoices[key].includes(details[key])) return `Choose an answer for ${key}. Not sure is available where applicable.`;
  if (step === 2 && !/^\d{1,7}$/.test(details.mileage || "")) return "Enter the current mileage as a whole number.";
  if (step === 4 && !/^\d{5}$/.test(details.zip || "")) return "Enter a five-digit vehicle ZIP code.";
  return "";
}

export function validateAppraisal(details: Record<string, string>) {
  if (details.appraisalVersion !== "1") throw new Error("Unsupported appraisal version.");
  for (const step of [0, 1, 2, 4]) {
    const error = validateAppraisalStep(details, step);
    if (error) throw new Error(error);
  }
}

export type AppraisalVehicle = { year: string; make: string; model: string; trim?: string };
export type CatalogVehicleImage = AppraisalVehicle & { src: string; licensed: boolean };

export function appraisalImage(vehicle: AppraisalVehicle, customerPhoto?: string, catalog?: CatalogVehicleImage) {
  if (customerPhoto?.startsWith("blob:")) return { src: customerPhoto, label: "Your selected photo · this tab only; not uploaded" };
  const equal = (first?: string, second?: string) => (first || "").trim().toLowerCase() === (second || "").trim().toLowerCase();
  if (catalog?.licensed && /^\/appraisal-media\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/.test(catalog.src) && ["year", "make", "model"].every(key => equal(vehicle[key as keyof AppraisalVehicle], catalog[key as keyof AppraisalVehicle])) && (!catalog.trim || equal(catalog.trim, vehicle.trim))) return { src: catalog.src, label: "Representative image—your vehicle may differ" };
  return { src: null, label: "Vehicle image unavailable · licensed photo catalog not connected" };
}
