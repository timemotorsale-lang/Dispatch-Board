export const TEST_DRIVE_FORM_PACKET = [{
  basis: "Dealership test-drive authorization and condition record; applicable Minnesota rights preserved",
  category: "Required" as const,
  description: "One-page driver authorization, route, time/mileage limits, responsibility terms, and return record.",
  id: "test-drive-agreement",
  label: "Test drive agreement and vehicle release",
  trigger: "Before every supervised or unaccompanied test drive"
}];

export function testDriveFacts(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = (key: string) => typeof source[key] === "string" ? (source[key] as string).trim().slice(0, 240) : "";
  const number = (key: string, fallback = NaN) => source[key] === undefined ? fallback
    : typeof source[key] === "number" ? source[key] as number
    : text(key) ? Number(text(key)) : NaN;
  return {
    driveMode: text("driveMode") || "SUPERVISED",
    accompanyingEmployee: text("accompanyingEmployee"),
    salesperson: text("salesperson"),
    driverLicense: text("driverLicense"),
    licenseState: text("licenseState"),
    licenseExpiration: text("licenseExpiration"),
    licenseVerified: source.licenseVerified === true,
    driverPhone: text("driverPhone"),
    driverEmail: text("driverEmail"),
    insuranceBasis: text("insuranceBasis") || "DRIVER_POLICY",
    insuranceCarrier: text("insuranceCarrier"),
    insurancePolicy: text("insurancePolicy"),
    insuranceVerified: source.insuranceVerified === true,
    departureAt: text("departureAt"),
    durationMinutes: number("durationMinutes", 30),
    mileageAllowance: number("mileageAllowance", 20),
    departureMileage: number("departureMileage"),
    fuelOut: text("fuelOut"),
    departureCondition: text("departureCondition"),
    approvedRoute: text("approvedRoute"),
    notes: text("notes"),
    returnAt: text("returnAt"),
    returnMileage: number("returnMileage"),
    returnCondition: text("returnCondition"),
    fuelIn: text("fuelIn"),
    keysReturned: source.keysReturned === true,
    receivedBy: text("receivedBy")
  };
}
export type TestDriveFacts = ReturnType<typeof testDriveFacts>;

function validInstant(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  return Boolean(match && Number.isFinite(Date.parse(value)) &&
    new Date(match[1]).toISOString().slice(0, 10) === match[1]);
}

export function testDriveDeadline(facts: TestDriveFacts) {
  if (!validInstant(facts.departureAt) || !Number.isSafeInteger(facts.durationMinutes) || facts.durationMinutes < 1) return "";
  const date = new Date(Date.parse(facts.departureAt) + facts.durationMinutes * 60000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

export function testDriveDateTime(value: string) {
  return validInstant(value) ? new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short"
  }).format(new Date(value)) + " (America/Chicago)" : "";
}

export type TestDriveAgreementIssue = { message: string; field: string; panel: "driver" | "vehicle" | "return" };
export function testDriveAgreementIssue(facts: TestDriveFacts): TestDriveAgreementIssue | null {
  const issue = (message: string, field: string, panel: TestDriveAgreementIssue["panel"] = "driver") => ({ message, field, panel });
  if (!["SUPERVISED", "UNACCOMPANIED"].includes(facts.driveMode)) return issue("Select a valid test-drive mode.", "Drive type", "driver");
  if (!facts.salesperson || (facts.driveMode === "SUPERVISED" && !facts.accompanyingEmployee)) return issue("Capture the authorizing employee and, for a supervised drive, the accompanying employee.", !facts.salesperson ? "Authorizing employee" : "Accompanying employee", "driver");
  if (!facts.driverLicense) return issue("Enter the driver's license number.", "Driver license");
  if (!facts.licenseState) return issue("Enter the license issuing state.", "License state");
  if (!facts.driverPhone) return issue("Enter the driver's phone number.", "Driver phone");
  if (!facts.licenseVerified) return issue('The license number is entered. Review the license, then check "Valid license verified" under Staff verification.', "Valid license verified");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(facts.licenseExpiration) ||
    !Number.isFinite(Date.parse(facts.licenseExpiration)) ||
    new Date(facts.licenseExpiration).toISOString().slice(0, 10) !== facts.licenseExpiration) return issue("Enter a valid license expiration date.", "License expiration", "driver");
  if (!testDriveDeadline(facts)) return issue("Enter a valid departure date/time and a positive whole-number duration.", !facts.departureAt ? "Start time" : "Time allowance (minutes)", "vehicle");
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date(facts.departureAt)).map((part) => [part.type, part.value]));
  if (facts.licenseExpiration < `${parts.year}-${parts.month}-${parts.day}`) return issue("The driver's license must be current on the test-drive date.", "License expiration", "driver");
  if (!["DRIVER_POLICY", "DEALER_REVIEW"].includes(facts.insuranceBasis) || !facts.insuranceVerified ||
    (facts.insuranceBasis === "DRIVER_POLICY" && (!facts.insuranceCarrier || !facts.insurancePolicy))) return issue("Record the insurance/coverage basis and staff review before generating the agreement.", !["DRIVER_POLICY", "DEALER_REVIEW"].includes(facts.insuranceBasis) ? "Coverage basis" : facts.insuranceBasis === "DRIVER_POLICY" && !facts.insuranceCarrier ? "Insurance carrier" : facts.insuranceBasis === "DRIVER_POLICY" && !facts.insurancePolicy ? "Insurance policy" : "Coverage reviewed for this drive", "driver");
  if (!Number.isSafeInteger(facts.departureMileage) || facts.departureMileage < 0 ||
    !Number.isSafeInteger(facts.mileageAllowance) || facts.mileageAllowance < 1 ||
    !Number.isSafeInteger(facts.departureMileage + facts.mileageAllowance)) return issue("Enter valid whole-number checkout mileage and a positive mileage allowance.", !Number.isSafeInteger(facts.departureMileage) || facts.departureMileage < 0 ? "Checkout odometer" : "Mileage allowance", "vehicle");
  if (!facts.approvedRoute || !facts.departureCondition || !facts.fuelOut) return issue("Capture the approved route, checkout condition, and fuel level.", !facts.approvedRoute ? "Approved route" : !facts.departureCondition ? "Checkout condition" : "Fuel out", "vehicle");
  const hasReturn = Boolean(facts.returnAt || Number.isFinite(facts.returnMileage) || facts.returnCondition || facts.fuelIn || facts.receivedBy || facts.keysReturned);
  if (hasReturn && (!validInstant(facts.returnAt) || Date.parse(facts.returnAt) < Date.parse(facts.departureAt) ||
    !Number.isSafeInteger(facts.returnMileage) || facts.returnMileage < facts.departureMileage ||
    !facts.returnCondition || !facts.fuelIn || !facts.receivedBy || !facts.keysReturned)) return issue("Complete the return time, odometer, fuel, condition, keys, and receiving employee; return must follow departure.", "Actual return time", "return");
  return null;
}

export function testDriveAgreementError(facts: TestDriveFacts): string | null {
  return testDriveAgreementIssue(facts)?.message ?? null;
}
