export const VENDOR_WORK_STATUSES = [
  "ESTIMATE_NEEDED",
  "APPROVAL_NEEDED",
  "SCHEDULED",
  "AT_VENDOR",
  "WAITING_PARTS",
  "SUPPLEMENT_NEEDED",
  "READY_FOR_PICKUP",
  "RETURN_TRANSPORT",
  "RETURNED",
  "QC_REQUIRED",
  "COMPLETED",
  "CANCELLED"
] as const;

export type VendorWorkStatus = (typeof VENDOR_WORK_STATUSES)[number];

type RapidReconWork = {
  lastUpdateSummary?: string | null;
  nextAction?: string | null;
  scope: string;
  status: string;
  transportMethod?: string | null;
};

const receivedStatuses = new Set(["AT_VENDOR", "WAITING_PARTS", "SUPPLEMENT_NEEDED", "READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED", "COMPLETED"]);
const repairCompleteStatuses = new Set(["READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED", "COMPLETED"]);
const failedPattern = /\b(fail|failed|incomplete|not fixed|problem still|still persists|rework|decision)\b/i;

export function vendorRapidReconAnswers(work: RapidReconWork) {
  const received = receivedStatuses.has(work.status);
  const failed = failedPattern.test(`${work.lastUpdateSummary} ${work.nextAction}`);
  const repairComplete = repairCompleteStatuses.has(work.status) && !failed;
  const returned = ["RETURNED", "QC_REQUIRED", "COMPLETED"].includes(work.status);

  return {
    received: received ? "Yes — vendor has custody" : work.status === "CANCELLED" ? "No — work cancelled" : "Confirmation needed",
    repairPlan: work.scope.trim() || "Scope confirmation needed",
    parts: work.status === "WAITING_PARTS" ? "Yes — parts are blocking work" : repairComplete ? "No open parts blocker" : "Confirm with vendor",
    repaired: failed ? "No — vendor repair failed or remains incomplete" : repairComplete ? "Yes — vendor reports repairs complete" : work.status === "AT_VENDOR" ? "No — repairs in progress" : "Not yet confirmed",
    transport: returned
      ? "Returned to dealership"
      : work.status === "RETURN_TRANSPORT"
        ? `Return transport in progress${work.transportMethod?.trim() ? ` · ${work.transportMethod}` : ""}`
        : work.status === "READY_FOR_PICKUP"
        ? `Plan return now${work.transportMethod?.trim() ? ` · ${work.transportMethod}` : ""}`
        : "Wait until repair completion",
    qcAndHandoff: work.status === "COMPLETED"
      ? "QC passed — continue to advisor review and handoff"
      : work.status === "QC_REQUIRED" || work.status === "RETURNED"
        ? failed ? "Dealership QC and repair decision are next" : "Dealership QC is next"
        : "Starts after the vehicle returns"
  };
}

export function vendorRapidReconTransitions(status: string): Array<{ label: string; status: VendorWorkStatus }> {
  const transitions: Record<string, Array<{ label: string; status: VendorWorkStatus }>> = {
    ESTIMATE_NEEDED: [{ label: "Estimate received — get approval", status: "APPROVAL_NEEDED" }, { label: "Vendor confirmed receipt", status: "AT_VENDOR" }],
    APPROVAL_NEEDED: [{ label: "Approved — vendor can repair", status: "AT_VENDOR" }, { label: "Schedule approved work", status: "SCHEDULED" }],
    SCHEDULED: [{ label: "Vendor confirmed receipt", status: "AT_VENDOR" }],
    AT_VENDOR: [{ label: "Parts are needed", status: "WAITING_PARTS" }, { label: "Supplement needs approval", status: "SUPPLEMENT_NEEDED" }, { label: "Repairs complete — plan return", status: "READY_FOR_PICKUP" }, { label: "Vendor failed — bring back", status: "RETURNED" }],
    WAITING_PARTS: [{ label: "Parts received — resume repair", status: "AT_VENDOR" }, { label: "Repairs complete — plan return", status: "READY_FOR_PICKUP" }, { label: "Vendor failed — bring back", status: "RETURNED" }],
    SUPPLEMENT_NEEDED: [{ label: "Send supplement for approval", status: "APPROVAL_NEEDED" }, { label: "Approved — resume repair", status: "AT_VENDOR" }],
    READY_FOR_PICKUP: [{ label: "Pickup / transport started", status: "RETURN_TRANSPORT" }, { label: "Vehicle returned", status: "RETURNED" }],
    RETURN_TRANSPORT: [{ label: "Vehicle returned", status: "RETURNED" }],
    RETURNED: [{ label: "Start dealership QC", status: "QC_REQUIRED" }],
    QC_REQUIRED: [{ label: "QC passed — ready for handoff", status: "COMPLETED" }, { label: "QC failed — return to vendor", status: "AT_VENDOR" }],
    COMPLETED: [],
    CANCELLED: []
  };
  return transitions[status] ?? [];
}

export function vendorRapidReconNextAction(status: string) {
  const actions: Record<string, string> = {
    ESTIMATE_NEEDED: "Get the vendor estimate and confirmed repair scope.",
    APPROVAL_NEEDED: "Approve or decline the exact vendor scope and amount.",
    SCHEDULED: "Confirm the vendor received the vehicle.",
    AT_VENDOR: "Confirm progress, parts need, and repair completion date.",
    WAITING_PARTS: "Record the needed parts and vendor ETA, then follow up.",
    SUPPLEMENT_NEEDED: "Review the changed scope and approve the supplement.",
    READY_FOR_PICKUP: "Assign return transportation and pickup time now.",
    RETURN_TRANSPORT: "Track pickup/transport ETA and confirm dealership receipt.",
    RETURNED: "Move the vehicle into dealership quality control.",
    QC_REQUIRED: "Complete QC; failed work returns to the vendor.",
    COMPLETED: "Continue to advisor review and inventory handoff.",
    CANCELLED: "Choose a new repair path if work is still required."
  };
  return actions[status] ?? "Record the next verified vendor fact.";
}
