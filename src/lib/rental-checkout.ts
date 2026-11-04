export function rentalCheckoutDefaults(read: (key: string) => unknown, pathway: string) {
  const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const facts = object(read(`${pathway}:rentalFacts`)), vehicle = object(read(`${pathway}:vehicleFacts`));
  const localTime = (date: unknown, time: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(date)) && /^\d{2}:\d{2}$/.test(String(time)) ? `${date}T${time}` : "";
  return { startsAt: localTime(facts.pickupDate, facts.pickupTime), expectedReturnAt: localTime(facts.dropoffDate, facts.dropoffTime), fuel: String(facts.fuelOut ?? ""), odometer: String(vehicle.mileageOut ?? "") };
}
