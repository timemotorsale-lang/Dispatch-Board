export const serviceCategories = ["Maintenance / oil service", "Brakes", "Tires / wheels", "Warning lights / diagnostics", "Engine / transmission", "Heating / air conditioning", "Electrical / battery", "Other / not sure"] as const;
export const drivabilityChoices = ["No known driving concern", "Concerned about driving", "Not drivable", "Not sure"] as const;
export const serviceDetailKeys = ["serviceVersion", "categories", "drivability", "contactMethod"];
export const serviceLabels: Record<string, string> = { year: "Year", make: "Make", model: "Model", vin: "VIN", mileage: "Mileage", categories: "Requested help", service: "Your description", drivability: "Driving concern", flexible: "Flexible timing", date: "Preferred date", window: "Time preference", contactMethod: "Preferred contact" };

export function serviceToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}

export function serviceStepError(details: Record<string, string>, step: number, now = new Date()) {
  if (step === 0) {
    if (!/^\d{4}$/.test(details.year || "") || Number(details.year) < 1886 || Number(details.year) > now.getFullYear() + 2 || !details.make?.trim() || !details.model?.trim()) return "Enter the vehicle year, make and model.";
    if (details.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(details.vin)) return "Review the 17-character VIN or clear it for manual entry.";
    if (details.mileage && !/^\d{1,7}$/.test(details.mileage)) return "Enter mileage as a whole number up to seven digits.";
  }
  if (step === 1) {
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
  }
  return "";
}

export function validateService(details: Record<string, string>) {
  if (details.serviceVersion !== "1") throw new Error("Unsupported service intake version.");
  for (const step of [0, 1, 2]) {
    const error = serviceStepError(details, step);
    if (error) throw new Error(error);
  }
}
