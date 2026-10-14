export type MinnesotaSaleFormCategory = "Required" | "Conditional";

export type MinnesotaSaleFormItem = {
  basis: string;
  category: MinnesotaSaleFormCategory;
  description: string;
  id: string;
  label: string;
  templatePath?: string;
  trigger: string;
};

export const MN_SALE_FORM_PACKET: MinnesotaSaleFormItem[] = [
  {
    basis: "Minn. R. 7400.5200",
    category: "Required",
    description: "Purchase terms with dealer, buyer, vehicle, sale price, trade allowance, itemized taxes/fees, date, and signatures.",
    id: "sales-agreement",
    label: "Sales agreement / purchase agreement",
    templatePath: "/forms/minnesota-retail-sale/sales-agreement.pdf",
    trigger: "Every Minnesota dealer sale"
  },
  {
    basis: "Minn. Stat. 168.277",
    category: "Required",
    description: "Bold buyer signature notice that the agreement may be binding and deposits may be at risk.",
    id: "binding-contract-disclosure",
    label: "Binding contract disclosure",
    templatePath: "/forms/minnesota-retail-sale/binding-contract-disclosure.pdf",
    trigger: "Every retail sale contract"
  },
  {
    basis: "Minn. R. 7400.5200 and Minn. Stat. 325E.15",
    category: "Required",
    description: "Mileage disclosure on the title or separate compliant odometer statement.",
    id: "odometer-disclosure",
    label: "Odometer disclosure",
    templatePath: "/forms/minnesota-retail-sale/odometer-disclosure.pdf",
    trigger: "Vehicle transfer unless exempt"
  },
  {
    basis: "Minnesota DVS title transfer process",
    category: "Required",
    description: "Application prepared for Minnesota title and registration submission through DVS.",
    id: "title-registration-application",
    label: "Application to title and register",
    templatePath: "/forms/minnesota-retail-sale/title-registration-application.pdf",
    trigger: "Minnesota retail customer"
  },
  {
    basis: "Minn. R. 7400.5200",
    category: "Required",
    description: "Itemized taxes and fees collected from customer and paid to the registrar.",
    id: "tax-fee-receipt",
    label: "Taxes and fees receipt",
    templatePath: "/forms/minnesota-retail-sale/tax-fee-receipt.pdf",
    trigger: "Minnesota retail customer"
  },
  {
    basis: "Minn. Stat. 168A.10",
    category: "Required",
    description: "Assigned title or manufacturer certificate of origin completed for ownership transfer.",
    id: "title-assignment",
    label: "Title assignment / MCO",
    templatePath: "/forms/minnesota-retail-sale/title-assignment.pdf",
    trigger: "Every titled vehicle sale"
  },
  {
    basis: "Minnesota DVS title and registration support",
    category: "Conditional",
    description: "Authorization for the dealership to complete title, registration, correction, or related vehicle paperwork on behalf of the customer when needed.",
    id: "power-of-attorney",
    label: "Power of attorney",
    templatePath: "/forms/minnesota-retail-sale/power-of-attorney.pdf",
    trigger: "Dealer signs or submits vehicle paperwork for customer"
  },
  {
    basis: "FTC Used Car Rule",
    category: "Conditional",
    description: "Used vehicle buyer disclosure displayed and delivered with warranty/as-is terms.",
    id: "buyers-guide",
    label: "Used vehicle buyer's guide",
    templatePath: "/forms/minnesota-retail-sale/buyers-guide.pdf",
    trigger: "Used retail vehicle"
  },
  {
    basis: "Minn. Stat. 53C.08",
    category: "Conditional",
    description: "Retail installment contract with required finance, payment, fee, tax, and charge disclosures.",
    id: "retail-installment-contract",
    label: "Retail installment contract",
    templatePath: "/forms/minnesota-retail-sale/retail-installment-contract.pdf",
    trigger: "Financed sale / BHPH"
  },
  {
    basis: "Dealership credit underwriting and account servicing control",
    category: "Conditional",
    description: "Customer-provided personal references for buyers purchasing on credit, including contact details, relationship, contact consent, and verification notes.",
    id: "personal-references",
    label: "Personal references and verification form",
    templatePath: "/forms/minnesota-retail-sale/personal-references.pdf",
    trigger: "Financed sale, BHPH, lease-to-own, or other vehicle purchase on credit"
  },
  {
    basis: "Minn. Stat. 53C.08, subd. 1a",
    category: "Conditional",
    description: "Separate signed disclosure for service contracts, insurance products, debt cancellation, theft deterrent, surface protection, and GPS starter interrupt.",
    id: "product-gps-disclosure",
    label: "Products and GPS disclosure",
    templatePath: "/forms/minnesota-retail-sale/product-gps-disclosure.pdf",
    trigger: "Add-on products or GPS installed"
  },
  {
    basis: "Deal funding control",
    category: "Conditional",
    description: "Lender approval, stipulations, funding proof, or certified funds evidence attached to the deal.",
    id: "funding-proof",
    label: "Funding proof",
    templatePath: "/forms/minnesota-retail-sale/funding-proof.pdf",
    trigger: "Outside finance, lender finance, or one-pay"
  },
  {
    basis: "Trade control",
    category: "Conditional",
    description: "Trade title, payoff quote, lienholder authorization, and allowance evidence.",
    id: "trade-documents",
    label: "Trade-in documents",
    templatePath: "/forms/minnesota-retail-sale/trade-documents.pdf",
    trigger: "Trade-in present"
  },
  {
    basis: "Store delivery control",
    category: "Conditional",
    description: "Delivery confirmation, insurance proof, temporary permit, and plate/registration handling evidence.",
    id: "delivery-documents",
    label: "Delivery and registration support",
    templatePath: "/forms/minnesota-retail-sale/delivery-documents.pdf",
    trigger: "Vehicle delivery"
  }
];

export function requiredMinnesotaSaleFormIds() {
  return MN_SALE_FORM_PACKET.filter((form) => form.category === "Required").map((form) => form.id);
}
