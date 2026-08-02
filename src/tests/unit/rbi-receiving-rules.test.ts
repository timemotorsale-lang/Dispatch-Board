import { describe, expect, it } from "vitest";

import { evaluateRbiReceiving, type RbiReceivingInput } from "@/features/prototype/rbi-receiving-rules";

const readyForIntake: RbiReceivingInput = {
  acceptedKeysCount: 2,
  arrivalOdometer: 53446,
  chargeState: "N/A",
  conditionVarianceFound: false,
  custodyDecision: "Accepted",
  documentsReceived: true,
  enginePhotoCaptured: true,
  exteriorPhotosCaptured: true,
  fuelState: "Quarter",
  interiorPhotosCaptured: true,
  keysCountMatchesTransport: true,
  locationConfirmed: true,
  locationPlaced: "Receiving lane",
  photoVarianceCaptured: false,
  pickupVsArrivalCompared: true,
  releasingPartyRecorded: true,
  varianceAssigned: false,
  varianceNoteRecorded: false,
  varianceSeverity: "None",
  vinDashPhotoCaptured: true,
  vinMatched: true,
  vinScanned: true,
};

describe("evaluateRbiReceiving", () => {
  it("marks the unit ready for intake when the receiving baseline is complete", () => {
    const result = evaluateRbiReceiving(readyForIntake);

    expect(result.readinessScore).toBe(100);
    expect(result.recommendation).toBe("Ready for intake");
    expect(result.blockers).toEqual([]);
    expect(result.confidence).toBe("High");
  });

  it("holds receiving when the baseline photos and custody decision are missing", () => {
    const result = evaluateRbiReceiving({
      ...readyForIntake,
      custodyDecision: "Pending review",
      enginePhotoCaptured: false,
      exteriorPhotosCaptured: false,
      interiorPhotosCaptured: false,
      vinDashPhotoCaptured: false,
    });

    expect(result.recommendation).toBe("Ready for baseline");
    expect(result.blockers).toContain("Baseline photo set is incomplete");
    expect(result.blockers).toContain("Receiving custody decision is incomplete");
  });

  it("opens an exception when arrival variance is found but still controlled", () => {
    const result = evaluateRbiReceiving({
      ...readyForIntake,
      conditionVarianceFound: true,
      photoVarianceCaptured: true,
      varianceAssigned: true,
      varianceNoteRecorded: true,
      varianceSeverity: "Moderate",
    });

    expect(result.recommendation).toBe("Exception");
    expect(result.blockers).toEqual([]);
    expect(result.positiveDrivers).toContain("VIN identity is matched to prior stages");
  });
});
