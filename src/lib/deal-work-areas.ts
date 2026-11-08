import { dealGroup, type DashboardDeal } from "./deal-dashboard";

export const DEAL_WORK_AREAS = {
  working: "Working Deals", sold: "Sold Deals", accounts: "Active Accounts",
  rentals: "Rentals & Loaners", repairs: "Repairs & Services", drives: "Test Drives",
  archive: "Archive", all: "All transactions",
} as const;
export type DealWorkArea = keyof typeof DEAL_WORK_AREAS;
export const isDealWorkArea = (value: string): value is DealWorkArea => Object.hasOwn(DEAL_WORK_AREAS, value);
type AreaRecord = Pick<DashboardDeal, "pathway" | "status" | "packetState" | "stage" | "soldDate" | "indicators">;
export function isRecordedSale(row: AreaRecord) {
  return dealGroup(row.pathway) === "SALES" && (row.status === "SOLD" || row.status === "COMPLETED" || Boolean(row.soldDate) || ["CLOSED", "DELIVERED_FUNDING_PENDING", "UNWIND_PENDING"].includes(row.packetState || ""));
}
export function belongsToDealArea(row: AreaRecord, area: DealWorkArea): boolean {
  if (area === "all") return true;
  const inactive = ["ARCHIVED", "CANCELLED", "LOST"].includes(row.status);
  const finished = row.status === "COMPLETED" || row.stage === "Completed";
  if (area === "archive") return inactive || finished && !isRecordedSale(row) && (row.pathway !== "lease-to-own" || !belongsToDealArea(row, "accounts"));
  if (inactive) return false;
  if (area === "sold") return isRecordedSale(row);
  if (area === "accounts") {
    // This is a review lens on the original agreement, not a new servicing ledger.
    const established = row.pathway === "bhph" ? isRecordedSale(row) : row.pathway === "lease-to-own" && (finished || row.status === "SOLD" || row.packetState === "DELIVERED_FUNDING_PENDING");
    const money = row.indicators?.financials;
    return established && (!finished || money?.outstandingCents == null || money.outstandingCents > 0 || money.creditCents > 0);
  }
  if (area === "working") return !isRecordedSale(row) && !finished && !(row.pathway === "lease-to-own" && row.status === "SOLD") && ["SALES", "LEASING", "PRODUCTS"].includes(dealGroup(row.pathway));
  if (finished) return false;
  if (area === "rentals") return ["daily-rental", "vehicle-loaner"].includes(row.pathway);
  if (area === "drives") return row.pathway === "test-drive";
  return row.pathway === "repairs";
}
export const DEAL_AREA_HELP: Record<DealWorkArea, string> = {
  working: "Quotes, applications and deals being prepared. Recorded sales and active vehicle-use work have their own views.",
  sold: "Recorded vehicle sales. Delivery, documents, funding and title remain separate checks on the original deal jacket.",
  accounts: "BHPH and lease agreements ready for account review. Open Money for verified entries and Follow-ups for the next task. A blank balance means it has not been recorded; this view does not calculate installments or delinquency from worksheets.",
  rentals: "Reservations, vehicles out and return follow-up for rentals and loaners.",
  repairs: "Service intake and repair handoffs. Continue in the linked repair workflow.",
  drives: "Test-drive agreements and vehicle returns, separate from vehicle sales.",
  archive: "Canceled, lost, archived and completed operational records. Documents and history remain available. Completed vehicle sales stay in Sold Deals; lease agreements stay separate from ownership-transfer sales.",
  all: "All accessible transactions, including history. Use an individual work area for daily work.",
};

export function dealProgress(row: Pick<DashboardDeal, "pathway" | "status" | "packetState" | "documentsTotal" | "documentsReady" | "indicators">) {
  const milestone = (value: { state: string } | null | undefined) => value?.state === "VERIFIED" ? "Verified" : value?.state === "NOT_REQUIRED" ? "Not required" : "Pending";
  return [
    { label: dealGroup(row.pathway) === "LEASING" ? "Agreement" : "Sale", value: ["SOLD", "COMPLETED"].includes(row.status) || ["CLOSED", "DELIVERED_FUNDING_PENDING"].includes(row.packetState || "") ? "Recorded" : row.status === "PENDING" ? "Pending" : row.status === "IN_PROGRESS" ? "Working" : row.status.toLowerCase() },
    { label: "Documents", value: row.packetState === "CLOSED" ? "Finalized" : row.documentsTotal ? `${row.documentsReady || 0}/${row.documentsTotal} reviewed` : "Not prepared" },
    { label: "Funding", value: milestone(row.indicators?.funding) },
    { label: "Delivery", value: milestone(row.indicators?.delivery) },
    { label: "Title", value: milestone(row.indicators?.title) },
  ];
}
