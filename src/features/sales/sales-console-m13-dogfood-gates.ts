export type SalesConsoleM13DogfoodGate = {
  gate: string;
  mergeGate: string;
  requiredEvidence: readonly string[];
  status: "ready" | "review";
};

export const salesConsoleM13DogfoodGates = [
  {
    gate: "pre-dogfood gate",
    mergeGate: "Owner approves controlled staff scope and read-only limitations.",
    requiredEvidence: ["build passes", "role views verified", "writes disabled", "read-only labels visible"],
    status: "ready"
  },
  {
    gate: "start dogfood gate",
    mergeGate: "Small group confirms they understand start cards and source verification.",
    requiredEvidence: ["staff guide visible", "role landing works", "source labels understandable"],
    status: "review"
  },
  {
    gate: "pause/rollback gate",
    mergeGate: "Pause if role access is wrong, source labels mislead staff, or buttons appear live.",
    requiredEvidence: ["rollback note visible", "feedback categories defined", "owner/admin monitor assigned"],
    status: "ready"
  },
  {
    gate: "exit dogfood gate",
    mergeGate: "Dogfood issues are categorized, resolved, or accepted before production pilot.",
    requiredEvidence: ["feedback reviewed", "known blockers documented", "go/no-go decision recorded"],
    status: "review"
  },
  {
    gate: "production pilot gate",
    mergeGate: "Production pilot waits until dogfood confirms value, role clarity, and safe source verification.",
    requiredEvidence: ["pilot audience approved", "observability reviewed", "no risky workflows enabled"],
    status: "review"
  }
] as const satisfies readonly SalesConsoleM13DogfoodGate[];

export function salesConsoleM13DogfoodGatesCoverReleasePath() {
  return salesConsoleM13DogfoodGates.map((gate) => gate.gate).join("|") ===
    "pre-dogfood gate|start dogfood gate|pause/rollback gate|exit dogfood gate|production pilot gate";
}

export function salesConsoleM13DogfoodGatesRequireEvidence() {
  return salesConsoleM13DogfoodGates.every((gate) =>
    gate.requiredEvidence.length >= 3 && gate.mergeGate.length > 40
  );
}

export function salesConsoleM13ProductionPilotStillWaits() {
  const gate = salesConsoleM13DogfoodGates.find((item) => item.gate === "production pilot gate");

  return gate?.status === "review" && gate.mergeGate.includes("waits");
}
