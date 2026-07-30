import type { SalesConsoleFreshness, SalesConsoleRevenueLaneName } from "./sales-console-operational-domain";

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
};

export const salesAppointmentIntegration = {
  sourceOwner: "Appointments / Calendar",
  readRoutes: ["/appointments", "/api/appointments"],
  staffSurface: "Appointments",
  governedWrites: ["schedule appointment", "reschedule appointment", "cancel appointment"],
  allowedSalesConsoleActions: ["view appointment context", "log internal sales activity"]
} as const;

export function mapSalesAppointment(source: SalesAppointmentSourceRecord, now = new Date()): SalesAppointmentViewModel {
  const updatedAt = new Date(source.updatedAt);
  const ageMs = now.getTime() - updatedAt.getTime();
  const freshness: SalesConsoleFreshness = ageMs > 1000 * 60 * 60 * 6 ? "stale" : "current";

  return {
    id: source.appointmentId,
    label: `${source.customerName} appointment`,
    scheduledTime: source.scheduledStart,
    confirmationStatus: source.confirmationStatus,
    arrivalState: source.arrivalState,
    customerLink: `/customers/${source.customerId}`,
    sourceLink: source.sourceRoute,
    opportunityContext: source.revenueLane
      ? `${source.revenueLane}${source.opportunityId ? ` · ${source.opportunityId}` : ""}`
      : "Sales opportunity not linked",
    freshness,
    writeAuthority: "Appointments / Calendar",
    salesConsoleAction: "view-context",
    schedulingWriteEnabled: false
  };
}

export function salesAppointmentMappingPreservesSourceOwnership(viewModel: SalesAppointmentViewModel) {
  return viewModel.writeAuthority === "Appointments / Calendar" && viewModel.schedulingWriteEnabled === false;
}
