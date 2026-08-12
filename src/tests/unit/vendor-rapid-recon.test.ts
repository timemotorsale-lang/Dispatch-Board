import { describe, expect, it } from "vitest";

import { vendorRapidReconAnswers, vendorRapidReconNextAction, vendorRapidReconTransitions } from "@/lib/vendor-rapid-recon";

describe("outside vendor rapid recon workflow", () => {
  it("answers the operational questions from one canonical vendor status", () => {
    expect(vendorRapidReconAnswers({ scope: "Replace front bumper and calibrate sensors", status: "WAITING_PARTS", transportMethod: "Carrier" })).toMatchObject({
      received: "Yes — vendor has custody",
      repairPlan: "Replace front bumper and calibrate sensors",
      parts: "Yes — parts are blocking work",
      repaired: "Not yet confirmed"
    });
  });

  it("starts return planning as soon as the vendor reports repairs complete", () => {
    const answers = vendorRapidReconAnswers({ scope: "Glass replacement", status: "READY_FOR_PICKUP", transportMethod: "Internal transport" });
    expect(answers.repaired).toContain("repairs complete");
    expect(answers.transport).toBe("Plan return now · Internal transport");
    expect(vendorRapidReconNextAction("READY_FOR_PICKUP")).toContain("Assign return transportation");
  });

  it("offers only the next verified rapid-recon events", () => {
    expect(vendorRapidReconTransitions("AT_VENDOR").map((item) => item.status)).toEqual(["WAITING_PARTS", "SUPPLEMENT_NEEDED", "READY_FOR_PICKUP", "RETURNED"]);
    expect(vendorRapidReconTransitions("READY_FOR_PICKUP").map((item) => item.status)).toEqual(["RETURN_TRANSPORT", "RETURNED"]);
    expect(vendorRapidReconTransitions("RETURN_TRANSPORT")).toEqual([{ label: "Vehicle returned", status: "RETURNED" }]);
    expect(vendorRapidReconTransitions("RETURNED")).toEqual([{ label: "Start dealership QC", status: "QC_REQUIRED" }]);
    expect(vendorRapidReconTransitions("COMPLETED")).toEqual([]);
  });

  it("routes failed or incomplete vendor repairs back to QC and repair decision", () => {
    const answers = vendorRapidReconAnswers({ lastUpdateSummary: "Vendor repair failed and problem still persists.", nextAction: "Bring back for QC and decision.", scope: "Timing concern", status: "RETURNED" });
    expect(answers.repaired).toContain("failed");
    expect(answers.qcAndHandoff).toContain("repair decision");
    expect(vendorRapidReconTransitions("QC_REQUIRED").map((item) => item.status)).toContain("AT_VENDOR");
  });
});
