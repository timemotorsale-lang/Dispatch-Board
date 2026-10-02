export const BHPH_WARRANTY_FORM_ID = "bhph-engine-transmission-warranty-return";
export const LEASE_WARRANTY_FORM_ID = "lease-engine-transmission-warranty-return";
export const DEALER_WARRANTY_POSTURE = "Dealer engine/transmission warranty: 30 days or 1,000 miles, whichever comes first; statutory coverage preserved.";

export type DealerWarrantyInput = { deliveryAt: string; deliveryMileage: string };
export type DealerWarrantyDetails = {
  delivery: string;
  expires: string;
  returnDeadline: string;
  startingMileage: number;
  endingMileage: number;
};

export function dealerWarrantyError(input: DealerWarrantyInput): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(input.deliveryAt);
  const calendarDate = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!match || !Number.isFinite(Date.parse(input.deliveryAt)) ||
    calendarDate?.toISOString().slice(0, 10) !== input.deliveryAt.slice(0, 10)) {
    return "Enter a valid delivery date and time before generating the dealer warranty.";
  }
  if (!/^\d+$/.test(input.deliveryMileage) || !Number.isSafeInteger(Number(input.deliveryMileage)) ||
    Number(input.deliveryMileage) > Number.MAX_SAFE_INTEGER - 1000) {
    return "Enter a valid whole-number delivery odometer before generating the dealer warranty.";
  }
  const end = Date.parse(input.deliveryAt) + 30 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(new Date(end).getTime())) return "Enter a delivery date within the supported range.";
  return null;
}

export function dealerWarrantyDetails(input: DealerWarrantyInput): DealerWarrantyDetails | null {
  if (dealerWarrantyError(input)) return null;
  const delivery = Date.parse(input.deliveryAt);
  const format = (value: number) => new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago"
  }).format(new Date(value)) + " (America/Chicago)";
  return {
    delivery: format(delivery),
    expires: format(delivery + 30 * 24 * 60 * 60 * 1000),
    returnDeadline: format(delivery + 24 * 60 * 60 * 1000),
    startingMileage: Number(input.deliveryMileage),
    endingMileage: Number(input.deliveryMileage) + 1000
  };
}
