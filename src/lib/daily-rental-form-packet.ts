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
    basis: "Minnesota daily rental master agreement; Minn. Stat. 65B.49 and 72A.125 review required",
    category: "Required",
    description: "Minnesota-focused rental agreement with renter, authorized driver, vehicle, rental window, rate, deposit, fuel, mileage, statutory notice, default, recovery, indemnity, and signature acknowledgements.",
    id: "daily-rental-agreement",
    label: "Daily rental agreement",
    trigger: "Every rental checkout"
  },
  {
    basis: "Minnesota rental terms, prohibited-use, and return control",
    category: "Required",
    description: "Terms covering authorized use, prohibited use, return duties, late return, repossession, fines, tolls, tickets, cleaning, fuel, and recovery charges.",
    id: "rental-terms-conditions",
    label: "Rental terms and conditions",
    trigger: "Every rental checkout"
  },
  {
    basis: "Minnesota vehicle damage/loss responsibility and claim cooperation disclosure",
    category: "Required",
    description: "Customer acknowledgement of responsibility for damage, theft, loss of use, towing, storage, administrative costs, and incident cooperation to the extent allowed by law.",
    id: "damage-loss-responsibility",
    label: "Damage and loss responsibility",
    trigger: "Every rental checkout"
  },
  {
    basis: "Minnesota optional protection election; Minn. Stat. 65B.49 and 72A.125 review required",
    category: "Required",
    description: "Accept-or-decline record for loss damage waiver or protection options, including acknowledgement that waiver is optional and not insurance.",
    id: "protection-election",
    label: "Protection election",
    trigger: "Every rental checkout"
  },
  {
    basis: "Minnesota insurance notice and payment authorization control",
    category: "Required",
    description: "Insurance responsibility, payment hold, and card authorization for rental charges, damage, fuel, tolls, tickets, late return, cleaning, and recovery charges.",
    id: "insurance-payment-authorization",
    label: "Insurance and payment authorization",
    trigger: "Every rental checkout"
  },
  {
    basis: "Vehicle condition evidence",
    category: "Required",
    description: "Checkout and return condition record for mileage, fuel, keys, equipment, existing damage, new damage, photos, and return signature.",
    id: "vehicle-condition-report",
    label: "Vehicle checkout and return condition report",
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
    basis: "Accident and incident reporting instruction",
    category: "Required",
    description: "Instructions for accident, theft, impound, police contact, claim reporting, repair prohibition, and customer cooperation.",
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
    basis: "Time Motor Sales counsel-approved courtesy/service loaner agreement draft",
    category: "Required",
    description: "Official Time Motor Sales customer courtesy/service loaner agreement covering customer, service transaction, courtesy vehicle, authorized drivers, insurance verification, prohibited uses, care, incident duties, responsibility, default, recovery, payment authorization, privacy, and acknowledgements.",
    id: "courtesy-loaner-agreement",
    label: "Courtesy / service loaner agreement",
    trigger: "Every vehicle loaner checkout"
  },
  {
    basis: "Approved courtesy loaner vehicle condition and return record",
    category: "Required",
    description: "Checkout and return record for pre-existing damage, return or incident notes, physical custody, condition, and representative acknowledgement.",
    id: "courtesy-loaner-condition-return-record",
    label: "Vehicle condition and return record",
    trigger: "Loaner vehicle release and return"
  },
  {
    basis: "Minnesota statutory rental vehicle insurance notice attached as Exhibit A",
    category: "Required",
    description: "Separate Minnesota statutory rental vehicle insurance notice and customer acknowledgement for courtesy/service loaner use.",
    id: "courtesy-loaner-minnesota-insurance-notice",
    label: "Minnesota statutory rental vehicle insurance notice",
    trigger: "Every vehicle loaner checkout"
  }
];

export function requiredCourtesyLoanerFormIds() {
  return COURTESY_LOANER_FORM_PACKET.filter((form) => form.category === "Required").map((form) => form.id);
}
