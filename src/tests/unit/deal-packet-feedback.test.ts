import { afterEach, describe, expect, it, vi } from "vitest";
import { packetCorrection, requestContractPacket } from "@/lib/deal-packet-feedback";

describe("Deal packet blocker feedback", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("routes warranty failures to the exact delivery fields", () => {
    expect(packetCorrection("Enter a valid delivery date and time before generating the dealer warranty.")?.fields[0]).toBe("Delivery date / time (local)");
    expect(packetCorrection("Enter a valid whole-number delivery odometer before generating the dealer warranty.")?.fields[0]).toBe("Delivery odometer");
  });
  it("routes lease, test-drive and completion blockers to relevant controls", () => {
    expect(packetCorrection("The next payment date must follow the lease date.")?.fields[0]).toBe("Next payment date");
    expect(packetCorrection("Enter a valid license expiration date.")?.fields[0]).toBe("License expiration");
    expect(packetCorrection("Signed paperwork stored")?.sections).toContain("paperwork");
    expect(packetCorrection("Servicing handoff complete")?.sections).toContain("handoff");
    expect(packetCorrection("Terms complete")?.sections).toContain("terms");
    expect(packetCorrection("Manager reviews clear")?.sections).toContain("approval");
    expect(packetCorrection("Funding verified")?.sections).toContain("funding");
  });
  it("does not invent a field correction for unknown failures", () => {
    expect(packetCorrection("Unexpected service failure")).toBeNull();
  });
  it("preserves server explanations and response status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Fix delivery odometer" }, { status: 400 })));
    const result = await requestContractPacket({ method: "POST" });
    expect(result.status).toBe(400);
    expect(await result.json()).toEqual({ error: "Fix delivery odometer" });
  });
  it("turns network and malformed responses into recoverable explanations", async () => {
    for (const fetcher of [vi.fn().mockRejectedValue(new Error("offline")), vi.fn().mockResolvedValue(new Response("gateway failed", { status: 502 }))]) {
      vi.stubGlobal("fetch", fetcher);
      const result = await requestContractPacket({ method: "POST" });
      expect(result.status).toBe(503);
      expect((await result.json()).error).toContain("Check Sales Documents before retrying");
    }
  });
});
