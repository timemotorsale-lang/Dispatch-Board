import { salesConsoleMvpRealDataWiring } from "./sales-console-mvp-real-data-wiring";

export type SalesConsoleM10SourceStatus = "fallback" | "unavailable" | "verify-first" | "wired";

export type SalesConsoleM10ReadOnlySourceWire = {
  adapterSurfaces: readonly string[];
  freshnessLabel: "current" | "placeholder" | "stale" | "unavailable" | "verify-first";
  guardrail: string;
  reader: string;
  sourceOwner: string;
  sourceSystem: string;
  status: SalesConsoleM10SourceStatus;
  systemOfRecord: true;
  writeEnabled: false;
};

export const salesConsoleM10ReadOnlySourceWiring = [
  {
    adapterSurfaces: ["Salesperson Today", "Manager Command Center"],
    freshnessLabel: "current",
    guardrail: "Tasks are read through the board read model only; task updates remain in the task/source workflow.",
    reader: "getBoardReadModelForToday",
    sourceOwner: "Operations board",
    sourceSystem: "Board/task read model",
    status: "wired",
    systemOfRecord: true,
    writeEnabled: false
  },
  {
    adapterSurfaces: ["Lead Operations", "Deal Desk visibility"],
    freshnessLabel: "verify-first",
    guardrail: "Lead records are read-only and deal visibility falls back unless negotiation/won status is trusted.",
    reader: "listRecentCustomerLeads",
    sourceOwner: "CRM/customer lead service",
    sourceSystem: "Customer lead read model",
    status: "wired",
    systemOfRecord: true,
    writeEnabled: false
  },
  {
    adapterSurfaces: ["Inventory Intelligence", "Source links"],
    freshnessLabel: "verify-first",
    guardrail: "Vehicle rows are read from registry only; holds, reservations, and availability changes remain disabled.",
    reader: "listVehicleRegistry",
    sourceOwner: "Vehicle registry",
    sourceSystem: "Vehicle registry read model",
    status: "wired",
    systemOfRecord: true,
    writeEnabled: false
  },
  {
    adapterSurfaces: ["Deal Desk", "Manager Command Center"],
    freshnessLabel: "placeholder",
    guardrail: "Deal rows remain visibility-only until a safe DMS/deal reader is selected.",
    reader: "lead-derived fallback adapter",
    sourceOwner: "CRM/DMS source systems",
    sourceSystem: "Deal visibility",
    status: "fallback",
    systemOfRecord: true,
    writeEnabled: false
  },
  {
    adapterSurfaces: ["Lead Operations", "Source links"],
    freshnessLabel: "placeholder",
    guardrail: "Appointment context remains fallback until the sales appointment reader is selected.",
    reader: "appointment fallback adapter",
    sourceOwner: "Appointment source system",
    sourceSystem: "Appointment context",
    status: "fallback",
    systemOfRecord: true,
    writeEnabled: false
  },
  {
    adapterSurfaces: ["Lead Operations", "Source links"],
    freshnessLabel: "unavailable",
    guardrail: "Marketing campaign/source attribution is not wired in this branch; lead source labels must be verified in CRM.",
    reader: "not wired",
    sourceOwner: "Advertising/marketing source systems",
    sourceSystem: "Marketing attribution",
    status: "unavailable",
    systemOfRecord: true,
    writeEnabled: false
  },
  {
    adapterSurfaces: ["Finance Handoff"],
    freshnessLabel: "unavailable",
    guardrail: "Finance package visibility is planned only; no finance decisions or sensitive finance fields are introduced.",
    reader: "not wired",
    sourceOwner: "Finance source system",
    sourceSystem: "Finance handoff",
    status: "unavailable",
    systemOfRecord: true,
    writeEnabled: false
  }
] as const satisfies readonly SalesConsoleM10ReadOnlySourceWire[];

export function m10SourceWiringExtendsMvpRealDataSources() {
  return salesConsoleMvpRealDataWiring.connectedSources.every((source) =>
    salesConsoleM10ReadOnlySourceWiring.some((wire) => wire.sourceSystem === source.source)
  );
}

export function m10ReadOnlySourcesPreserveSystemOfRecord() {
  return salesConsoleM10ReadOnlySourceWiring.every((wire) => wire.systemOfRecord && wire.writeEnabled === false);
}

export function m10ReadOnlySourcesHaveHonestFallbackLabels() {
  return salesConsoleM10ReadOnlySourceWiring.every((wire) =>
    ["current", "placeholder", "stale", "unavailable", "verify-first"].includes(wire.freshnessLabel)
  );
}

export function m10UnavailableSourcesRemainBlocked() {
  return salesConsoleM10ReadOnlySourceWiring
    .filter((wire) => wire.status === "unavailable")
    .every((wire) => wire.reader === "not wired" && wire.writeEnabled === false);
}

export function m10WiredSourcesUseNamedReadServices() {
  const namedReaders = ["getBoardReadModelForToday", "listRecentCustomerLeads", "listVehicleRegistry"];

  return salesConsoleM10ReadOnlySourceWiring
    .filter((wire) => wire.status === "wired")
    .every((wire) => namedReaders.includes(wire.reader));
}
