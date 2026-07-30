import { salesConsoleRevenueOpportunities } from "./sales-console-operational-domain";

export type SalesConsoleSearchResult = {
  id: string;
  label: string;
  detail: string;
  workspace: string;
  source: string;
  customerName: string;
  lane: string;
  tokens: string[];
};

export const salesConsoleSearchRecords: SalesConsoleSearchResult[] = [
  ...salesConsoleRevenueOpportunities.map((opportunity) => ({
    id: opportunity.opportunityId,
    label: opportunity.customerName,
    detail: `${opportunity.lane} · ${opportunity.selectedVehicle?.label ?? "No vehicle selected"} · ${opportunity.stage}`,
    workspace: "Revenue Desk",
    source: opportunity.source.ownerSystem,
    customerName: opportunity.customerName,
    lane: opportunity.lane,
    tokens: [
      opportunity.opportunityId,
      opportunity.customerName,
      opportunity.contact,
      opportunity.owner,
      opportunity.stage,
      opportunity.lane,
      opportunity.source.label,
      opportunity.source.ownerSystem,
      opportunity.selectedVehicle?.stockNumber ?? "",
      opportunity.selectedVehicle?.label ?? ""
    ]
  })),
  {
    id: "CUST-360-1001",
    label: "John Smith Customer 360",
    detail: "Consent, active opportunity, documents, promises, and timeline",
    workspace: "Customers",
    source: "CRM",
    customerName: "John Smith",
    lane: "Inventory Cash Sale",
    tokens: ["John Smith", "(555) 123-4567", "john.smith@email.com", "Customer 360", "CRM"]
  },
  {
    id: "INV-TMS22145",
    label: "2022 Toyota RAV4 XLE",
    detail: "Stock #TMS22145 · Ready · medium market pressure",
    workspace: "Inventory Intelligence",
    source: "Inventory",
    customerName: "John Smith",
    lane: "Inventory Cash Sale",
    tokens: ["2022 Toyota RAV4 XLE", "TMS22145", "Inventory", "Ready", "RAV4"]
  },
  {
    id: "MGR-REVIEW-17",
    label: "Manager review queue",
    detail: "17 open reviews across deal, trade, LTO, warranty, and finance questions",
    workspace: "Manager Command",
    source: "Sales Console",
    customerName: "John Smith",
    lane: "Inventory Cash Sale",
    tokens: ["manager review", "review queue", "approval backlog", "stalled revenue"]
  }
];

export function searchSalesConsoleRecords(query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return [];

  return salesConsoleSearchRecords.filter((record) =>
    record.tokens.some((token) => token.toLowerCase().includes(normalized))
  );
}

export function salesConsoleSearchIsReadOnly() {
  return salesConsoleSearchRecords.every((record) => record.id && record.workspace && record.source);
}
