export type DailyRentalFormCategory = "Required" | "Conditional";

export type DailyRentalFormItem = {
  basis: string;
  category: DailyRentalFormCategory;
  description: string;
  id: string;
  label: string;
  trigger: string;
};

export const DAILY_RENTAL_FORM_PACKET: DailyRentalFormItem[] = [
  {
    basis: "Enterprise daily vehicle rental agreement and Minnesota rental-vehicle risk-control record",
    category: "Required",
    description: "Customer-facing daily vehicle rental agreement covering renter identity, authorized drivers, vehicle custody, rental period, rates, payment hold, mileage, fuel, insurance representation, prohibited use, incidents, default, recovery, indemnity, and acknowledgements.",
    id: "daily-rental-agreement",
    label: "Daily vehicle rental agreement",
    trigger: "Every rental checkout"
  },
  {
    basis: "Daily rental terms, prohibited-use controls, return duties, and charge schedule",
    category: "Required",
    description: "Terms covering authorized use, prohibited use, territory, return duties, late return, lawful recovery, fines, tolls, tickets, cleaning, fuel, missing equipment, and administrative charges.",
    id: "rental-terms-conditions",
    label: "Rental terms and conditions",
    trigger: "Every rental checkout"
  },
  {
    basis: "Vehicle damage, theft, loss, claim cooperation, and reimbursement responsibility record",
    category: "Required",
    description: "Customer acknowledgement of responsibility for physical damage, theft, conversion, towing, storage, impound, loss of use, diminished value, claim expenses, and incident cooperation to the extent allowed by law.",
    id: "damage-loss-responsibility",
    label: "Damage and loss responsibility",
    trigger: "Every rental checkout"
  },
  {
    basis: "Minnesota rental vehicle insurance notice and optional protection election control",
    category: "Required",
    description: "Accept-or-decline record for any separate compliant protection option, with Minnesota notice acknowledgement and clear statement that no collision damage waiver is sold unless a separate compliant program applies.",
    id: "protection-election",
    label: "Minnesota insurance notice and protection election",
    trigger: "Every rental checkout"
  },
  {
    basis: "Insurance representation, payment authorization, deposit hold, and post-return charge control",
    category: "Required",
    description: "Insurance responsibility, payment hold, and card authorization for rental charges, damage, fuel, tolls, tickets, late return, cleaning, and recovery charges.",
    id: "insurance-payment-authorization",
    label: "Insurance and payment authorization",
    trigger: "Every rental checkout"
  },
  {
    basis: "Vehicle custody, checkout condition, return condition, and photo evidence record",
    category: "Required",
    description: "Checkout and return condition record for mileage, fuel, keys, equipment, existing damage, new damage, required photos, return notes, and custody acknowledgement.",
    id: "vehicle-condition-report",
    label: "Vehicle condition, checkout, and return record",
    trigger: "Vehicle release and return"
  },
  {
    basis: "Authorized driver control",
    category: "Conditional",
    description: "Additional authorized driver acknowledgement tied to license eligibility and the rental agreement.",
    id: "additional-driver-addendum",
    label: "Additional driver addendum",
    trigger: "Additional driver requested"
  },
  {
    basis: "Accident, theft, impound, citation, tow, police contact, and claim reporting instruction",
    category: "Required",
    description: "Instructions for accident, theft, impound, police contact, claim reporting, repair prohibition, evidence preservation, and customer cooperation.",
    id: "incident-reporting-instructions",
    label: "Accident and incident instructions",
    trigger: "Every rental checkout"
  }
];

export function requiredDailyRentalFormIds() {
  return DAILY_RENTAL_FORM_PACKET.filter((form) => form.category === "Required").map((form) => form.id);
}

export const COURTESY_LOANER_FORM_PACKET: DailyRentalFormItem[] = [
  {
    basis: "Enterprise courtesy vehicle loaner agreement and dealership risk-control record",
    category: "Required",
    description: "Customer-facing courtesy vehicle loaner agreement covering temporary custody, authorized drivers, eligibility, insurance representation, Minnesota notice incorporation, prohibited use, care, incidents, financial responsibility, indemnity, recovery, payment authorization, privacy, and acknowledgements.",
    id: "courtesy-loaner-agreement",
    label: "Courtesy vehicle loaner agreement",
    trigger: "Every vehicle loaner checkout"
  },
  {
    basis: "Vehicle custody, checkout condition, return condition, and incident evidence record",
    category: "Required",
    description: "Checkout and return record for mileage, fuel, keys, equipment, pre-existing damage, required photos, custody, incident notes, return condition, and representative acknowledgement.",
    id: "courtesy-loaner-condition-return-record",
    label: "Vehicle condition, custody, and return record",
    trigger: "Loaner vehicle release and return"
  },
  {
    basis: "Separate Minnesota rental vehicle insurance notice and customer acknowledgement",
    category: "Required",
    description: "Separate Minnesota rental vehicle insurance notice and customer acknowledgement for courtesy vehicle loaner use, maintained apart from any optional protection or waiver program.",
    id: "courtesy-loaner-minnesota-insurance-notice",
    label: "Minnesota rental vehicle insurance notice",
    trigger: "Every vehicle loaner checkout"
  }
];

export function requiredCourtesyLoanerFormIds() {
  return COURTESY_LOANER_FORM_PACKET.filter((form) => form.category === "Required").map((form) => form.id);
}
