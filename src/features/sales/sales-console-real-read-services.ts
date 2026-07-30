import {
  getSalesConsoleAppointmentHref,
  getSalesConsoleCustomer360Href,
  getSalesConsoleTaskHref,
  getSalesConsoleVehicle360Href
} from "./sales-console-cross-console-integration";
import type { SalesConsoleFreshness, SalesConsoleRevenueLaneName } from "./sales-console-operational-domain";

export type SalesConsoleReadSourceKey =
  | "customers"
  | "appointments"
  | "tasks"
  | "inventory"
  | "service"
  | "finance"
  | "rental"
  | "warranty"
  | "salesInternal";

export type SalesConsoleReadSourceStatus = "connected" | "fallback" | "unavailable";

export type SalesConsoleReadSourceDefinition = {
  key: SalesConsoleReadSourceKey;
  owner: string;
  readRoute: string;
  appRoute: string;
  status: SalesConsoleReadSourceStatus;
  writeAuthority: "source-system" | "sales-console";
};

export type SalesConsoleSourceBackedRecord = {
  id: string;
  sourceKey: SalesConsoleReadSourceKey;
  customerName: string;
  title: string;
  subtitle: string;
  lane?: SalesConsoleRevenueLaneName;
  freshness: SalesConsoleFreshness;
  sourceHref: string;
  fallback: boolean;
};

export type SalesConsoleRealReadSnapshot = {
  sources: SalesConsoleReadSourceDefinition[];
  records: SalesConsoleSourceBackedRecord[];
  unavailableSources: SalesConsoleReadSourceKey[];
};

export const salesConsoleReadSourceDefinitions: SalesConsoleReadSourceDefinition[] = [
  { key: "customers", owner: "CRM / Customers", readRoute: "/api/customers/customer-360", appRoute: "/customers/customer-360", status: "connected", writeAuthority: "source-system" },
  { key: "appointments", owner: "Appointments / Calendar", readRoute: "/api/appointments", appRoute: "/appointments", status: "connected", writeAuthority: "source-system" },
  { key: "tasks", owner: "Tasks", readRoute: "/api/tasks", appRoute: "/tasks", status: "connected", writeAuthority: "source-system" },
  { key: "inventory", owner: "Inventory / Vehicles", readRoute: "/api/vehicles", appRoute: "/vehicles/360", status: "connected", writeAuthority: "source-system" },
  { key: "service", owner: "Service / Repairs", readRoute: "/api/service-intake/repair-orders", appRoute: "/vehicles/repair-orders", status: "connected", writeAuthority: "source-system" },
  { key: "finance", owner: "Finance", readRoute: "/sales?workspace=finance-handoff", appRoute: "/sales?workspace=finance-handoff", status: "fallback", writeAuthority: "source-system" },
  { key: "rental", owner: "Rental", readRoute: "/sales?workspace=rental", appRoute: "/sales?workspace=rental", status: "fallback", writeAuthority: "source-system" },
  { key: "warranty", owner: "Warranty", readRoute: "/sales?workspace=warranty", appRoute: "/sales?workspace=warranty", status: "fallback", writeAuthority: "source-system" },
  { key: "salesInternal", owner: "Sales Console", readRoute: "/sales", appRoute: "/sales", status: "connected", writeAuthority: "sales-console" }
];

export function buildSalesConsoleSourceRecord(input: {
  id: string;
  sourceKey: SalesConsoleReadSourceKey;
  customerName: string;
  title: string;
  subtitle: string;
  lane?: SalesConsoleRevenueLaneName;
  freshness?: SalesConsoleFreshness;
  fallback?: boolean;
}) {
  const sourceHref =
    input.sourceKey === "customers"
      ? getSalesConsoleCustomer360Href(input.customerName)
      : input.sourceKey === "appointments"
        ? getSalesConsoleAppointmentHref(input.id)
        : input.sourceKey === "tasks"
          ? getSalesConsoleTaskHref(input.id)
          : input.sourceKey === "inventory"
            ? getSalesConsoleVehicle360Href(input.id)
            : (salesConsoleReadSourceDefinitions.find((source) => source.key === input.sourceKey)?.appRoute ?? "/sales");

  return {
    id: input.id,
    sourceKey: input.sourceKey,
    customerName: input.customerName,
    title: input.title,
    subtitle: input.subtitle,
    lane: input.lane,
    freshness: input.freshness ?? "current",
    sourceHref,
    fallback: input.fallback ?? false
  } satisfies SalesConsoleSourceBackedRecord;
}

export function buildSalesConsoleRealReadSnapshot(records: SalesConsoleSourceBackedRecord[]): SalesConsoleRealReadSnapshot {
  const unavailableSources = salesConsoleReadSourceDefinitions
    .filter((source) => source.status === "unavailable")
    .map((source) => source.key);

  return {
    sources: salesConsoleReadSourceDefinitions,
    records,
    unavailableSources
  };
}

export function salesConsoleReadServicesKeepWritesOutOfSources() {
  return salesConsoleReadSourceDefinitions.every(
    (source) => source.writeAuthority === "source-system" || source.key === "salesInternal"
  );
}

export function salesConsoleReadServicesCoverMvpSources() {
  const keys = new Set(salesConsoleReadSourceDefinitions.map((source) => source.key));

  return ["customers", "appointments", "tasks", "inventory", "service", "finance", "rental", "warranty", "salesInternal"].every((key) =>
    keys.has(key as SalesConsoleReadSourceKey)
  );
}
