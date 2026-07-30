import type { SalesConsoleFreshness, SalesConsoleRevenueLaneName } from "./sales-console-operational-domain";
import { withSalesConsoleReturnTo } from "./sales-console-cross-console-integration";

export type SalesAppointmentSourceRecord = {
  appointmentId: string;
  customerId: string;
  customerName: string;
  scheduledStart: string;
  confirmationStatus: "confirmed" | "unconfirmed" | "needs-confirmation" | "canceled";
  arrivalState: "not-arrived" | "arrived" | "no-show" | "completed";
  sourceRoute: string;
  opportunityId?: string;
  revenueLane?: SalesConsoleRevenueLaneName;
  updatedAt: string;
};

export type SalesAppointmentViewModel = {
  id: string;
  label: string;
  scheduledTime: string;
  confirmationStatus: SalesAppointmentSourceRecord["confirmationStatus"];
  arrivalState: SalesAppointmentSourceRecord["arrivalState"];
  customerLink: string;
  sourceLink: string;
  opportunityContext: string;
  freshness: SalesConsoleFreshness;
  writeAuthority: "Appointments / Calendar";
  salesConsoleAction: "view-context" | "log-internal-activity";
  schedulingWriteEnabled: false;
  readinessScore: number;
  showNoShowRisk: "low" | "medium" | "high";
  preparationChecklist: string[];
  followUpTrigger: string;
  appointmentTaskCorrelation: string;
};

export const salesAppointmentIntegration = {
  sourceOwner: "Appointments / Calendar",
  readRoutes: ["/appointments", "/api/appointments"],
  staffSurface: "Appointments",
  governedWrites: ["schedule appointment", "reschedule appointment", "cancel appointment"],
  allowedSalesConsoleActions: ["view appointment context", "log internal sales activity"]
} as const;

function clampAppointmentScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function evaluateSalesAppointmentExecution(source: SalesAppointmentSourceRecord, now = new Date()) {
  const startsAt = new Date(source.scheduledStart);
  const minutesUntilStart = Math.round((startsAt.getTime() - now.getTime()) / 60000);
  const isPast = minutesUntilStart < 0;
  const confirmationPenalty = source.confirmationStatus === "confirmed" ? 0 : source.confirmationStatus === "needs-confirmation" ? 25 : 18;
  const arrivalPenalty = source.arrivalState === "no-show" ? 45 : source.arrivalState === "not-arrived" && isPast ? 30 : 0;
  const sourceLinkBonus = source.opportunityId && source.revenueLane ? 15 : 0;
  const timingBonus = minutesUntilStart >= 0 && minutesUntilStart <= 180 ? 18 : minutesUntilStart > 180 ? 8 : 0;
  const readinessScore = clampAppointmentScore(72 + sourceLinkBonus + timingBonus - confirmationPenalty - arrivalPenalty);
  const showNoShowRisk: SalesAppointmentViewModel["showNoShowRisk"] =
    source.arrivalState === "no-show" || (isPast && source.arrivalState === "not-arrived")
      ? "high"
      : source.confirmationStatus === "confirmed"
        ? "low"
        : "medium";
  const preparationChecklist = [
    "verify Customer 360 context",
    source.revenueLane ? `review ${source.revenueLane} lane` : "link sales opportunity",
    source.confirmationStatus === "confirmed" ? "prepare visit materials" : "confirm appointment before handoff"
  ];
  const followUpTrigger =
    source.arrivalState === "no-show"
      ? "create no-show recovery follow-up recommendation"
      : source.arrivalState === "completed"
        ? "review post-appointment next step"
        : source.confirmationStatus === "confirmed"
          ? "prepare pre-appointment sales context"
          : "confirm appointment and customer intent";

  return {
    readinessScore,
    showNoShowRisk,
    preparationChecklist,
    followUpTrigger,
    appointmentTaskCorrelation: source.opportunityId ? `linked to ${source.opportunityId}` : "needs task/opportunity correlation"
  };
}

export function mapSalesAppointment(source: SalesAppointmentSourceRecord, now = new Date()): SalesAppointmentViewModel {
  const updatedAt = new Date(source.updatedAt);
  const ageMs = now.getTime() - updatedAt.getTime();
  const freshness: SalesConsoleFreshness = ageMs > 1000 * 60 * 60 * 6 ? "stale" : "current";

  const execution = evaluateSalesAppointmentExecution(source, now);

  return {
    id: source.appointmentId,
    label: `${source.customerName} appointment`,
    scheduledTime: source.scheduledStart,
    confirmationStatus: source.confirmationStatus,
    arrivalState: source.arrivalState,
    customerLink: withSalesConsoleReturnTo(`/customers/customer-360?customerId=${encodeURIComponent(source.customerId)}`),
    sourceLink: withSalesConsoleReturnTo(source.sourceRoute),
    opportunityContext: source.revenueLane
      ? `${source.revenueLane}${source.opportunityId ? ` · ${source.opportunityId}` : ""}`
      : "Sales opportunity not linked",
    freshness,
    writeAuthority: "Appointments / Calendar",
    salesConsoleAction: "view-context",
    schedulingWriteEnabled: false,
    ...execution
  };
}

export function salesAppointmentMappingPreservesSourceOwnership(viewModel: SalesAppointmentViewModel) {
  return viewModel.writeAuthority === "Appointments / Calendar" && viewModel.schedulingWriteEnabled === false;
}
