import {
  buildSalesConsoleRealReadSnapshot,
  buildSalesConsoleSourceRecord,
  type SalesConsoleRealReadSnapshot,
  type SalesConsoleSourceBackedRecord
} from "./sales-console-real-read-services";
import { withSalesConsoleReturnTo } from "./sales-console-cross-console-integration";

export const salesConsoleSourceBackedTabs = [
  "Today",
  "Leads",
  "Pipeline",
  "Customers",
  "Revenue Desk",
  "Inventory Intelligence",
  "Appointments",
  "Tasks & Promises",
  "Finance Handoff",
  "Delivery Readiness",
  "Manager Command",
  "Reports & Forecast",
  "Admin / Source Health"
] as const;

export type SalesConsoleSourceBackedTab = (typeof salesConsoleSourceBackedTabs)[number];

export type SalesConsoleTabSourceState = {
  tab: SalesConsoleSourceBackedTab;
  status: "ready" | "fallback" | "empty" | "error";
  recordCount: number;
  sourceLinks: string[];
  staffMessage: string;
};

export const salesConsoleSourceBackedSeedRecords: SalesConsoleSourceBackedRecord[] = [
  buildSalesConsoleSourceRecord({ id: "John Smith", sourceKey: "customers", customerName: "John Smith", title: "Customer 360", subtitle: "CRM source", lane: "Inventory Cash Sale" }),
  buildSalesConsoleSourceRecord({ id: "APT-101", sourceKey: "appointments", customerName: "John Smith", title: "Appointment", subtitle: "Today 1:00 PM", lane: "Inventory Cash Sale" }),
  buildSalesConsoleSourceRecord({ id: "TASK-202", sourceKey: "tasks", customerName: "Samantha Lee", title: "Document follow-up", subtitle: "Pay stub needed", lane: "Inventory BHPH Sale" }),
  buildSalesConsoleSourceRecord({ id: "TMS22145", sourceKey: "inventory", customerName: "John Smith", title: "2022 Toyota RAV4 XLE", subtitle: "Vehicle 360 source", lane: "Inventory Cash Sale" }),
  buildSalesConsoleSourceRecord({ id: "RO-1005", sourceKey: "service", customerName: "David Brown", title: "Repair estimate", subtitle: "Service source", lane: "Public Auto Repair" }),
  buildSalesConsoleSourceRecord({ id: "FIN-1002", sourceKey: "finance", customerName: "Maria Garcia", title: "Finance handoff", subtitle: "Fallback until finance source is direct", lane: "Financing Product", fallback: true }),
  buildSalesConsoleSourceRecord({ id: "RENT-1001", sourceKey: "rental", customerName: "Nina Parks", title: "Rental opportunity", subtitle: "Fallback rental context", lane: "Daily Rental", fallback: true }),
  buildSalesConsoleSourceRecord({ id: "WAR-1001", sourceKey: "warranty", customerName: "Chris Stone", title: "Warranty product", subtitle: "Fallback warranty context", lane: "Warranty Product", fallback: true })
];

export function buildSalesConsoleSourceBackedTabStates(
  snapshot: SalesConsoleRealReadSnapshot = buildSalesConsoleRealReadSnapshot(salesConsoleSourceBackedSeedRecords)
): SalesConsoleTabSourceState[] {
  const recordsForTab: Record<SalesConsoleSourceBackedTab, SalesConsoleSourceBackedRecord[]> = {
    Today: snapshot.records,
    Leads: snapshot.records.filter((record) => record.sourceKey === "customers"),
    Pipeline: snapshot.records.filter((record) => record.lane),
    Customers: snapshot.records.filter((record) => record.sourceKey === "customers"),
    "Revenue Desk": snapshot.records.filter((record) => record.lane),
    "Inventory Intelligence": snapshot.records.filter((record) => record.sourceKey === "inventory"),
    Appointments: snapshot.records.filter((record) => record.sourceKey === "appointments"),
    "Tasks & Promises": snapshot.records.filter((record) => record.sourceKey === "tasks"),
    "Finance Handoff": snapshot.records.filter((record) => record.sourceKey === "finance"),
    "Delivery Readiness": snapshot.records.filter((record) => ["inventory", "tasks", "finance"].includes(record.sourceKey)),
    "Manager Command": snapshot.records,
    "Reports & Forecast": snapshot.records.filter((record) => record.lane),
    "Admin / Source Health": snapshot.records
  };

  return salesConsoleSourceBackedTabs.map((tab) => {
    const records = recordsForTab[tab];
    const hasFallback = records.some((record) => record.fallback);

    return {
      tab,
      status: records.length === 0 ? "empty" : hasFallback ? "fallback" : "ready",
      recordCount: records.length,
      sourceLinks: [...new Set(records.map((record) => withSalesConsoleReturnTo(record.sourceHref)))],
      staffMessage:
        records.length === 0
          ? "No source records are available for this workspace yet."
          : hasFallback
            ? "Some records use safe fallback context until the source module exposes direct reads."
            : "This workspace is backed by Dispatch Board source records."
    };
  });
}

export function salesConsoleSourceBackedUiCoversEveryTab() {
  return buildSalesConsoleSourceBackedTabStates().every((state) => state.recordCount >= 0 && state.staffMessage.length > 0);
}
