import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TciTransportTool } from "@/features/prototype/tci-transport-tool";
import { evaluateTciTransport, type TciTransportInput } from "@/features/prototype/tci-transport-rules";

const towInput: TciTransportInput = {
  arrivalOdometer: 0, arrivalPhotosCaptured: false, conditionVariance: "Pending review", currentLocation: "Auction ready line",
  destinationConfirmed: true, destinationLocation: "Time Motor Sales receiving", documentsConfirmed: true, driverAssigned: true, driverPlan: "Tow vendor", etaHours: 2,
  exceptionResolved: false, exceptionType: "None", gatePassReady: true, gateReleaseConfirmed: true, jumperReminderConfirmed: false,
  keysConfirmed: true, keysReceivedCount: 0, keysTypicallyHeldByAuction: true, keysTransferredCount: 0,
  mobilityDecision: "Tow to dealership", oilChecked: false, pickupOdometer: 0, pickupPerson: "Release desk",
  pickupPhotosCaptured: false, pickupSignatureCaptured: false, plateReminderConfirmed: false, receivingAccepted: false,
  receivingLocationConfirmed: false, routeRisk: 2, sourceLocation: "Manheim Minneapolis / Maple Grove", towVendorConfirmed: true,
  trackingStatus: "At source", transportCost: 150, uberNeeded: false, uberPlanned: false, vehicleLocatedAtSource: true, coolantChecked: false,
};

describe("TciTransportTool", () => {
  it("renders the guided transportation custody workspace and work trail shell", () => {
    const markup = renderToStaticMarkup(<TciTransportTool onProgressChange={() => undefined} />);

    expect(markup).toContain("TMS Transport Custody Intelligence");
    expect(markup).toContain("Transportation Custody Builder");
    expect(markup).toContain("Source location");
    expect(markup).toContain("Release readiness");
    expect(markup).toContain("How will this vehicle move?");
    expect(markup).toContain("Dealership driver");
    expect(markup).toContain("Tow or carrier");
    expect(markup).toContain("Choose dealership driver or tow / carrier above");
    expect(markup).not.toContain("Oil checked before drive");
    expect(markup).toContain("0/8 checklist lines cleared");
    expect(markup).toContain("Operational work trail");
    expect(markup).toContain("No transportation action has been recorded yet.");
  });

  it("hides driver-only, Uber, and fluid questions for a tow", () => {
    const markup = renderToStaticMarkup(<TciTransportTool initialTransportMode="TOW" onProgressChange={() => undefined} />);

    expect(markup).toContain("Tow / carrier coordination");
    expect(markup).toContain("Tow / carrier assigned");
    expect(markup).toContain("Tow movement");
    expect(markup).toContain("Transportation destination");
    expect(markup).not.toContain("Uber needed");
    expect(markup).not.toContain("Oil checked before drive");
    expect(markup).not.toContain("Coolant checked before drive");
    expect(markup).not.toContain("Dealer plate reminder confirmed");
    expect(markup).not.toContain("Jumper reminder confirmed");
    expect(markup).not.toContain("Starts / runs");
  });

  it("does not block a tow on driver fluid, plate, jumper, or Uber controls", () => {
    const result = evaluateTciTransport(towInput);

    expect(result.planComplete).toBe(true);
    expect(result.movementComplete).toBe(true);
    expect(result.negativeDrivers.join(" ")).not.toMatch(/fluid|jumper|plate|Uber/i);
    expect(result.blockers.join(" ")).not.toMatch(/Driver coordination|Pickup custody|Receiving acceptance/i);
  });

  it("requires an entered destination and names a tow blocker correctly", () => {
    const result = evaluateTciTransport({ ...towInput, destinationLocation: "" });

    expect(result.planComplete).toBe(false);
    expect(result.blockers).toContain("Tow / carrier coordination or destination is incomplete");
  });
});
