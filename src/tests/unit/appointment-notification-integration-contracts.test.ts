import { describe, expect, it } from "vitest";

import {
  buildAppointmentNotificationContractHarness,
  buildAppointmentNotificationInboundContracts,
  buildAppointmentNotificationOutboundContracts
} from "@/features/appointments/appointment-notification-integration-contracts";

describe("appointment notification integration contracts", () => {
  it("builds outbound contracts for future adapters", () => {
    const contracts = buildAppointmentNotificationOutboundContracts({
      appointmentId: "APT-10245",
      policies: [
        {
          id: "policy-manager-inbox",
          label: "Manager Inbox",
          enabled: true,
          urgency: "high",
          deepLinkTarget: "detail-rail"
        }
      ],
      fanoutSources: [
        {
          id: "fanout-1",
          title: "Manager escalation recorded",
          status: "suppressed",
          notificationLabels: ["Manager Inbox", "Shift Handoff Digest"]
        }
      ]
    });

    expect(contracts).toHaveLength(5);
    expect(contracts[0]?.versionLabel).toBe("v1.notification-outbound");
    expect(contracts.find((contract) => contract.adapter === "calendar")?.redactionLabel).toContain(
      "Redacted"
    );
  });

  it("builds inbound command contracts for replay and recovery", () => {
    const contracts = buildAppointmentNotificationInboundContracts({
      policies: [
        {
          id: "policy-delivery-failures",
          label: "Delivery Failures",
          enabled: true,
          urgency: "critical",
          deepLinkTarget: "resolution-workbench"
        }
      ]
    });

    expect(contracts).toHaveLength(3);
    expect(contracts.some((contract) => contract.commandLabel.includes("Replay"))).toBe(true);
  });

  it("builds harness results from outbound and inbound contracts", () => {
    const harness = buildAppointmentNotificationContractHarness({
      outboundContracts: buildAppointmentNotificationOutboundContracts({
        appointmentId: "APT-10245",
        policies: [
          {
            id: "policy-manager-inbox",
            label: "Manager Inbox",
            enabled: true,
            urgency: "high",
            deepLinkTarget: "detail-rail"
          }
        ],
        fanoutSources: []
      }),
      inboundContracts: buildAppointmentNotificationInboundContracts({
        policies: [
          {
            id: "policy-manager-inbox",
            label: "Manager Inbox",
            enabled: true,
            urgency: "high",
            deepLinkTarget: "detail-rail"
          }
        ]
      })
    });

    expect(harness).toHaveLength(5);
    expect(harness.find((result) => result.adapterLabel === "SMS adapter")?.status).toBe("warning");
    expect(harness.find((result) => result.adapterLabel === "CRM adapter")?.status).toBe("ready");
  });
});
