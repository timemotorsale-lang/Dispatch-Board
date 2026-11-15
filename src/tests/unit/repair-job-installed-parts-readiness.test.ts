import { expect, it } from "vitest";
import { waitingJobPartsReady } from "@/lib/repair-job-parts-readiness";

it("counts a saved installation toward the same job's demand without counting it twice", () => {
  const demand = { partId: "pads", status: "RELEASED", quantityRequired: 1, quantityReserved: 0 };
  const job = { partsRequired: true, partCustodyEvents: [{ partId: "pads", type: "INSTALL", quantity: 1 }] };
  expect(waitingJobPartsReady({ ...job, partDemands: [demand] })).toBe(true);
  expect(waitingJobPartsReady({ ...job, partDemands: [demand, demand] })).toBe(false);
  expect(waitingJobPartsReady({ ...job, partDemands: [{ ...demand, partId: "rotor" }] })).toBe(false);
});
