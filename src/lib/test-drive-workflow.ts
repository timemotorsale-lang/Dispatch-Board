import { PIPELINE_TIMEZONE } from "./crm-pipeline";
import { testDriveFacts, testDriveAgreementIssue, testDriveDeadline } from "./test-drive-form-packet";

export const TEST_DRIVE_TIMEZONE = PIPELINE_TIMEZONE;
export const DRIVE_PHOTOS = ["front", "rear", "sides", "interior", "odometer"] as const;
export const DRIVE_PHOTO_LABELS = ["Front", "Rear", "Both sides", "Interior", "Odometer & fuel"];
export const DRIVE_RETURN_PHOTOS = ["front", "rear", "interior", "odometer", "damage"] as const;
export const DRIVE_RETURN_PHOTO_LABELS = ["Return front", "Return rear", "Return interior", "Return odometer & fuel", "Damage / no-damage review"];
export const DRIVE_STEPS = ["Driver & Vehicle", "Verify", "Sign Agreement", "Release", "Return"] as const;

export function driveLocalTime(value: Date | string, timezone = TEST_DRIVE_TIMEZONE) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// Reject nonexistent or ambiguous local times rather than silently shifting the drive.
export function driveInstant(value: string, timezone = TEST_DRIVE_TIMEZONE) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return "";
  const guess = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(guess)) return "";
  const candidates = new Set<number>();
  for (const sample of [guess - 86400000, guess, guess + 86400000]) {
    const offset = Date.parse(`${driveLocalTime(new Date(sample), timezone)}:00Z`) - sample;
    const actual = guess - offset;
    if (driveLocalTime(new Date(actual), timezone) === value) candidates.add(actual);
  }
  return candidates.size === 1 ? new Date([...candidates][0]).toISOString() : "";
}

export function driveFactsFromDraft(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return testDriveFacts({ ...source, departureAt: driveInstant(`${source.testDriveDate ?? ""}T${source.startTime ?? ""}`), returnAt: "", returnMileage: "", returnCondition: "", fuelIn: "", receivedBy: "", keysReturned: false });
}

export function driveAgreementContent(value: unknown, customerId: string, vin: string) {
  return JSON.stringify({ customerId, vin, facts: driveFactsFromDraft(value) });
}

export function driveReadiness(value: unknown, customerSelected: boolean, vin: string) {
  const facts = driveFactsFromDraft(value), issue = testDriveAgreementIssue(facts);
  const missing = [
    !customerSelected && "Customer",
    !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin) && "Vehicle with a valid 17-character VIN",
    !facts.driverPhone && "Driver phone",
    !facts.driverLicense && "Driver license",
    !facts.licenseState && "License state",
    !facts.licenseExpiration && "License expiration",
    !testDriveDeadline(facts) && "Valid departure date, time and time allowance",
    !(facts.mileageAllowance > 0) && "Positive mileage allowance",
    (!Number.isSafeInteger(facts.departureMileage) || facts.departureMileage < 0) && "Checkout odometer (whole number)",
    !facts.fuelOut && "Fuel out",
    !facts.departureCondition && "Checkout condition",
    !facts.approvedRoute && "Approved route"
  ].filter((field): field is string => typeof field === "string");
  const identity = missing.length === 0;
  return { identity, verified: identity && !issue, issue, facts, missing };
}

export function driveReturnFacts(value: Record<string, unknown>, departureMileage: number, departureAt: Date) {
  const returnedAt = driveInstant(String(value.returnAt ?? ""));
  const mileage = value.returnMileage === "" || value.returnMileage == null ? NaN : Number(value.returnMileage);
  const exception = value.returnException === true;
  const note = String(value.exceptionNote ?? "").trim();
  if (!returnedAt || new Date(returnedAt) < departureAt || Date.parse(returnedAt) > Date.now() + 60000) throw new Error("Enter an actual return time after departure and no later than now.");
  if (!Number.isSafeInteger(mileage) || mileage < departureMileage) throw new Error("Return odometer must be a whole number at least as high as checkout.");
  if (!String(value.fuelIn ?? "").trim() || !String(value.returnCondition ?? "").trim() || !String(value.receivedBy ?? "").trim()) throw new Error("Record return fuel, condition and receiving employee.");
  if (value.keysReturned !== true && !exception) throw new Error("Confirm all keys returned or record an exception.");
  if (exception && (note.length < 10 || note.length > 1000)) throw new Error("Describe the exception and next action in 10–1000 characters.");
  return { returnedAt: new Date(returnedAt), mileage, exception, note, keysReturned: value.keysReturned === true, fuel: String(value.fuelIn).trim().slice(0, 100), condition: String(value.returnCondition).trim().slice(0, 1000), recipient: String(value.receivedBy).trim().slice(0, 200) };
}

export function driveDueState(expectedReturnAt: string, now = new Date()) {
  const remaining = Date.parse(expectedReturnAt) - now.getTime();
  return remaining <= 0 ? "Return overdue" : remaining <= 15 * 60000 ? "Due within 15 minutes" : "Test drive active";
}
