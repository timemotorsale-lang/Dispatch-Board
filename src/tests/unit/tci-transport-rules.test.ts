import { describe, expect, it } from "vitest";

import { evaluateTciTransport, type TciTransportInput } from "@/features/prototype/tci-transport-rules";

const inTransitReady: TciTransportInput = {
  arrivalOdometer: 53446,
  arrivalPhotosCaptured: false,
  conditionVariance: "None",
  currentLocation: "TMS receiving lane",
  destinationConfirmed: true,
  destinationLocation: "Time Motor Sales receiving",
  documentsConfirmed: true,
  driverAssigned: true,
  driverPlan: "Internal driver",
  etaHours: 2,
  exceptionResolved: false,
  exceptionType: "None",
  gatePassReady: true,
  gateReleaseConfirmed: true,
  jumperReminderConfirmed: true,
  keysConfirmed: true,
  keysReceivedCount: 0,
  keysTypicallyHeldByAuction: true,
  keysTransferredCount: 2,
  mobilityDecision: "Drive to dealership",
  oilChecked: true,
  pickupOdometer: 53421,
  pickupPerson: "Manheim release desk",
  pickupPhotosCaptured: false,
  pickupSignatureCaptured: true,
  plateReminderConfirmed: true,
  receivingAccepted: true,
  receivingLocationConfirmed: true,
  routeRisk: 2,
  sourceLocation: "Manheim Minneapolis / Maple Grove",
  towVendorConfirmed: false,
  trackingStatus: "Delivered",
  transportCost: 45,
  uberNeeded: false,
  uberPlanned: false,
  vehicleLocatedAtSource: true,
  coolantChecked: true,
};

describe("evaluateTciTransport", () => {
  it("marks the custody chain ready for intake when all transportation proofs are complete", () => {
    const result = evaluateTciTransport(inTransitReady);

    expect(result.transportScore).toBe(98);
    expect(result.recommendation).toBe("Ready for intake");
    expect(result.blockers).toEqual([]);
    expect(result.confidence).toBe("Medium");
    expect(result.pickupPhotosRecommended).toBe(true);
    expect(result.transportStepSummary).toBe("6 of 6 custody controls complete");
  });

  it("holds transportation when release, plan, and movement controls are missing", () => {
    const result = evaluateTciTransport({
      ...inTransitReady,
      gatePassReady: false,
      driverAssigned: false,
      oilChecked: false,
      pickupSignatureCaptured: false,
      receivingAccepted: false,
    });

    expect(result.recommendation).toBe("Ready for release");
    expect(result.blockers).toContain("Gate pass or source release is incomplete");
    expect(result.blockers).toContain("Driver coordination or destination is incomplete");
    expect(result.blockers).toContain("Drive-or-tow readiness is incomplete");
    expect(result.blockers).not.toContain("Pickup custody proof is incomplete");
  });

  it("does not block transportation when pickup photos are deferred to receiving", () => {
    const result = evaluateTciTransport(inTransitReady);

    expect(result.blockers).toEqual([]);
    expect(result.negativeDrivers).not.toContain("Pickup photos are recommended for TMS staff on direct-drive moves");
  });

  it("surfaces open exceptions even after pickup has happened", () => {
    const result = evaluateTciTransport({
      ...inTransitReady,
      exceptionResolved: false,
      exceptionType: "Delay",
      trackingStatus: "In transit",
    });

    expect(result.recommendation).toBe("Exception");
    expect(result.blockers).toContain("Open transportation exception: delay");
    expect(result.negativeDrivers).toContain("Delay remains open and assigned");
  });

  it("treats legacy transportation records without a destination as incomplete instead of crashing", () => {
    const legacyInput = { ...inTransitReady } as Partial<TciTransportInput>;
    delete legacyInput.destinationLocation;

    expect(() => evaluateTciTransport(legacyInput as TciTransportInput)).not.toThrow();
    expect(evaluateTciTransport(legacyInput as TciTransportInput).blockers).toContain("Driver coordination or destination is incomplete");
  });
});
