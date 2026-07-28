export const salesConsoleMvpRealDataWiring = {
  boundary: "Milestone 5 wires real read-only source services through a server read model. Missing or unsafe sources remain mock/source-shaped fallback data.",
  connectedSources: [
    {
      fallback: "Falls back to source-shaped task records when no sales tasks are mapped.",
      source: "Board/task read model",
      status: "wired",
      surfaces: ["Salesperson Today", "Manager Command Center"]
    },
    {
      fallback: "Falls back to source-shaped lead signals when recent leads are unavailable.",
      source: "Customer lead read model",
      status: "wired",
      surfaces: ["Lead Operations", "Deal Desk visibility"]
    },
    {
      fallback: "Falls back to source-shaped vehicle matches when registry rows are unavailable.",
      source: "Vehicle registry read model",
      status: "wired",
      surfaces: ["Inventory Intelligence", "Source links"]
    },
    {
      fallback: "Deal rows remain visibility-only and fallback when lead-derived deal status is not trusted.",
      source: "Deal visibility",
      status: "hybrid-fallback",
      surfaces: ["Deal Desk", "Manager Command Center"]
    },
    {
      fallback: "Appointment context remains fallback until a safe sales appointment reader is selected.",
      source: "Appointment context",
      status: "fallback",
      surfaces: ["Lead Operations", "Source links"]
    }
  ],
  guardrails: [
    "Read services are called through injectable readers.",
    "No source writer, command service, or mutation route is introduced.",
    "Fallback data is explicit when a source cannot be safely mapped.",
    "Real data presence does not enable excluded MVP actions."
  ]
} as const;
