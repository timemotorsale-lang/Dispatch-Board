export const serviceCategories = ["Maintenance / oil service", "Brakes", "Tires / wheels", "Warning lights / diagnostics", "Engine / transmission", "Heating / air conditioning", "Electrical / battery", "Other / not sure"] as const;
export const drivabilityChoices = ["No known driving concern", "Concerned about driving", "Not drivable", "Not sure"] as const;
export const concernChoices = {
  onset: ["Not sure", "Today", "This week", "More than a week ago"],
  frequency: ["Not sure", "Always", "Sometimes", "Happened once"],
  occurs: ["Not sure", "Starting", "Idling", "Accelerating", "Braking", "Turning", "Highway driving", "Other"],
  previousRepair: ["Not sure", "No", "Yes"]
} as const;
export const serviceVisitChoices = {
  visitType: ["Discuss with an advisor", "Drop off", "Wait if available", "Vehicle already at dealership"],
  requesterRole: ["Owner / personal vehicle", "Driver / acting for someone else", "Fleet / company contact"],
  coverage: ["Not sure", "No coverage review requested", "Warranty / service contract review requested"],
  transport: ["No assistance requested", "Discuss transportation options"],
  mileageUnit: ["miles", "kilometers"]
} as const;
export type ServiceConcern = { category: string; description: string; onset: string; frequency: string; occurs: string; warningMessage: string; previousRepair: string; previousWork: string; primary: boolean };
export const serviceDetailKeys = ["serviceVersion", "categories", "drivability", "contactMethod", "concerns", ...Object.keys(serviceVisitChoices), "accommodations", "alternateDate"];
export const serviceLabels: Record<string, string> = { year: "Year", make: "Make", model: "Model", vin: "VIN", mileage: "Odometer", mileageUnit: "Odometer units", categories: "Requested help", service: "Your description", drivability: "Customer-reported driving concern", visitType: "Arrival preference", requesterRole: "Requesting as", coverage: "Coverage review", transport: "Transportation request", accommodations: "Communication / access preferences", flexible: "Flexible timing", date: "Preferred date", alternateDate: "Alternate date", window: "Time preference", contactMethod: "Preferred contact" };

export function emptyServiceConcern(primary = false): ServiceConcern {
  return { category: "", description: "", onset: "Not sure", frequency: "Not sure", occurs: "Not sure", warningMessage: "", previousRepair: "Not sure", previousWork: "", primary };
}

export function readServiceConcerns(value: string): ServiceConcern[] {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("Review the concern details."); }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 5) throw new Error("Add between one and five concerns.");
  const concerns = parsed.map((value): ServiceConcern => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Review the concern details.");
    const input = value as Record<string, unknown>;
    const text = (key: string, limit: number) => {
      if (typeof input[key] !== "string" || (input[key] as string).length > limit) throw new Error("A concern field is missing or too long.");
      return (input[key] as string).trim();
    };
    const concern = { category: text("category", 80), description: text("description", 600), onset: text("onset", 40), frequency: text("frequency", 40), occurs: text("occurs", 40), warningMessage: text("warningMessage", 150), previousRepair: text("previousRepair", 20), previousWork: text("previousWork", 250), primary: input.primary };
    if (typeof concern.primary !== "boolean") throw new Error("Choose a main concern.");
    if (concern.category && !(serviceCategories as readonly string[]).includes(concern.category)) throw new Error("Choose supported service concerns.");
    if (!concern.category && !concern.description) throw new Error("Select a concern or describe what you notice.");
    for (const key of ["onset", "frequency", "occurs", "previousRepair"] as const) {
      if (!(concernChoices[key] as readonly string[]).includes(concern[key])) throw new Error("Review when the concern occurs and any previous repair.");
    }
    if (concern.previousRepair !== "Yes" && concern.previousWork) throw new Error("Clear previous repair details when no related repair is selected.");
    return concern as ServiceConcern;
  });
  if (concerns.filter(concern => concern.primary).length !== 1) throw new Error("Choose exactly one main concern.");
  return concerns;
}

export function serviceNeedsAdvisorReview(details: Record<string, string>) {
  return details.drivability !== "No known driving concern";
}

export function serviceHandoff(details: Record<string, string>) {
  const concerns = details.serviceVersion === "2" ? readServiceConcerns(details.concerns) : [];
  return {
    drivingReview: serviceNeedsAdvisorReview(details) ? "Advisor driving-concern review requested" : "No driving concern reported; safety not assessed",
    relatedRepairReview: concerns.some(concern => concern.previousRepair === "Yes"),
    coverageReview: details.coverage === "Warranty / service contract review requested",
    authorityReview: Boolean(details.requesterRole && details.requesterRole !== "Owner / personal vehicle"),
    concernCount: concerns.length || 1,
    delivery: "NOT_CONNECTED",
    appointment: "NOT_BOOKED",
    repairAuthorization: "NOT_GRANTED"
  };
}

export function serviceToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}

export function serviceStepError(details: Record<string, string>, step: number, now = new Date()) {
  if (step === 0) {
    if (!/^\d{4}$/.test(details.year || "") || Number(details.year) < 1886 || Number(details.year) > now.getFullYear() + 2 || !details.make?.trim() || !details.model?.trim()) return "Enter the vehicle year, make and model.";
    if (details.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(details.vin)) return "Review the 17-character VIN or clear it for manual entry.";
    if (details.mileage && !/^\d{1,7}$/.test(details.mileage)) return "Enter mileage as a whole number up to seven digits.";
    if (details.serviceVersion === "2" && !(drivabilityChoices as readonly string[]).includes(details.drivability)) return "Choose a driving-concern answer. Not sure is available.";
    if (details.serviceVersion === "2" && !(serviceVisitChoices.mileageUnit as readonly string[]).includes(details.mileageUnit)) return "Choose odometer units.";
  }
  if (step === 1) {
    if (details.serviceVersion === "2") {
      try { readServiceConcerns(details.concerns); } catch (error) { return error instanceof Error ? error.message : "Review the concern details."; }
      return "";
    }
    const categories = (details.categories || "").split("|").filter(Boolean);
    if (new Set(categories).size !== categories.length || categories.some(value => !(serviceCategories as readonly string[]).includes(value))) return "Choose supported service concerns.";
    if (!categories.length && !details.service?.trim()) return "Select a concern or describe what you notice.";
    if (!(drivabilityChoices as readonly string[]).includes(details.drivability)) return "Choose a driving-concern answer. Not sure is available.";
  }
  if (step === 2) {
    if (!["yes", "no"].includes(details.flexible)) return "Choose flexible timing or a preferred date.";
    if (details.flexible === "no") {
      const date = details.date || "";
      const parsed = new Date(`${date}T12:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < serviceToday(now)) return "Choose a valid preferred date that is not in the past in Minnesota.";
    } else if (details.date || details.window) return "Clear date and time preferences when timing is flexible.";
    if (!["Either", "Email", "Phone call"].includes(details.contactMethod)) return "Choose a supported contact preference.";
    if (details.serviceVersion === "2") {
      for (const key of ["visitType", "requesterRole", "coverage", "transport"] as const) {
        if (!(serviceVisitChoices[key] as readonly string[]).includes(details[key])) return "Review your visit preferences.";
      }
      if (serviceNeedsAdvisorReview(details) && details.visitType === "Wait if available") return "Discuss arrival with an advisor before requesting a waiting visit.";
      if ((details.accommodations || "").length > 300) return "Keep communication and access preferences within 300 characters.";
      if (details.flexible === "yes" && details.alternateDate) return "Clear date and time preferences when timing is flexible.";
      if (details.alternateDate) {
        const alternate = serviceStepError({ ...details, serviceVersion: "1", flexible: "no", date: details.alternateDate }, 2, now);
        if (alternate) return "Choose a valid alternate date that is not in the past in Minnesota.";
      }
    }
  }
  return "";
}

export function validateService(details: Record<string, string>) {
  if (!["1", "2"].includes(details.serviceVersion)) throw new Error("Unsupported service intake version.");
  for (const step of [0, 1, 2]) {
    const error = serviceStepError(details, step);
    if (error) throw new Error(error);
  }
}
