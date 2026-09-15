import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { GET } from "@/app/api/crm/v1/contract-packets/[packetId]/route";
import { POST } from "@/app/api/crm/v1/contract-packets/route";

describe("Unified CRM contract packet route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "manager-1" });
  });

  it("generates and reads an archived Minnesota sale packet", async () => {
    const created = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", {
      body: JSON.stringify({
        customerName: "Alex Buyer",
        feeTotal: "$22.25",
        preparedFormIds: ["sales-agreement", "odometer-disclosure", "power-of-attorney"],
        salePrice: "$12,500.00",
        vehicle: {
          color: "Black",
          make: "Toyota",
          model: "Corolla",
          stockNumber: "123456",
          trim: "LE",
          vin: "1NXBR32E85Z123456",
          year: "2005"
        }
      }),
      method: "POST"
    }));

    expect(created.status).toBe(201);
    const packet = await created.json();
    expect(packet.status).toBe("ARCHIVED");
    expect(packet.documents).toHaveLength(3);
    expect(packet.documents[0].html).toContain("Alex Buyer");
    expect(packet.documents[0].html).toContain("Black");
    expect(packet.delivery).toMatchObject({ downloadReady: true, emailReady: true, printReady: true, textReady: true });
    expect(packet.auditTrail[0].action).toBe("CONTRACT_PACKET_GENERATED");

    const archived = await GET(new Request("http://crm.local/api/crm/v1/contract-packets/packet-1"), {
      params: Promise.resolve({ packetId: packet.packetId })
    });
    expect(archived.status).toBe(200);
    await expect(archived.json()).resolves.toMatchObject({ packetId: packet.packetId, status: "ARCHIVED" });
  });

  it("requires authentication before packet generation", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const response = await POST(new Request("http://crm.local/api/crm/v1/contract-packets", { body: "{}", method: "POST" }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
      error: "Sign in before generating a contract packet."
    });
  });
});
