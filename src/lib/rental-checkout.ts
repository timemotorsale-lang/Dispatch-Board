export function rentalCheckoutDefaults(read: (key: string) => unknown, pathway: string) {
  const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const facts = object(read(`${pathway}:rentalFacts`)), vehicle = object(read(`${pathway}:vehicleFacts`));
  const localTime = (date: unknown, time: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(date)) && /^\d{2}:\d{2}$/.test(String(time)) ? `${date}T${time}` : "";
  return { startsAt: localTime(facts.pickupDate, facts.pickupTime), expectedReturnAt: localTime(facts.dropoffDate, facts.dropoffTime), fuel: String(facts.fuelOut ?? ""), odometer: String(vehicle.mileageOut ?? "") };
}
export const RENTAL_TIMEZONE = "America/Chicago";

const chicagoInputTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: RENTAL_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23"
});

export function rentalLocalTime(value: Date | string) {
  return chicagoInputTime.format(new Date(value)).replace(" ", "T");
}
export function rentalTimeChoices(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return [];
  const wallTime = Date.parse(`${value}:00Z`);
  return [5, 6].map(offset => new Date(wallTime + offset * 3600000))
    .filter(candidate => Number.isFinite(candidate.getTime()) && rentalLocalTime(candidate) === value);
}

export function rentalTimeIso(value: string, repeatedHour?: string) {
  if (!value) return "";
  const choices = rentalTimeChoices(value);
  if (!choices.length) throw new Error(`${value.replace("T", " ")} is not a valid Chicago local time.`);
  if (choices.length > 1 && repeatedHour !== "first" && repeatedHour !== "second") {
    throw new Error("Choose which occurrence of the repeated Chicago hour to use.");
  }
  return choices[repeatedHour === "second" && choices.length > 1 ? 1 : 0].toISOString();
}
