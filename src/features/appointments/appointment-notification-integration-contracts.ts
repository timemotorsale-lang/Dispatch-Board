"use client";

export type AppointmentIntegrationAdapter = "sms" | "email" | "calendar" | "crm" | "dms";

export type AppointmentNotificationOutboundContractEntry = {
  id: string;
  adapter: AppointmentIntegrationAdapter;
  adapterLabel: string;
  versionLabel: string;
  eventLabel: string;
  deliveryKeyLabel: string;
  redactionLabel: string;
  statusLabel: string;
  detail: string;
  actionLabel: string;
};

export type AppointmentNotificationInboundContractEntry = {
  id: string;
  commandLabel: string;
  versionLabel: string;
  routingLabel: string;
  idempotencyLabel: string;
  actorLabel: string;
  conflictLabel: string;
  actionLabel: string;
};

export type AppointmentNotificationContractHarnessResult = {
  id: string;
  adapterLabel: string;
  directionLabel: string;
  status: "ready" | "warning";
  tone: "green" | "amber";
  detail: string;
  actionLabel: string;
};

type NotificationPolicyInput = {
  id: string;
  label: string;
  enabled: boolean;
  urgency: string;
  deepLinkTarget: string;
};

type NotificationFanoutSourceInput = {
  id: string;
  title: string;
  status: string;
  notificationLabels: string[];
};

function adapterLabel(adapter: AppointmentIntegrationAdapter) {
  switch (adapter) {
    case "sms":
      return "SMS adapter";
    case "email":
      return "Email adapter";
    case "calendar":
      return "Calendar adapter";
    case "crm":
      return "CRM adapter";
    default:
      return "DMS adapter";
  }
}

export function buildAppointmentNotificationOutboundContracts(input: {
  appointmentId: string;
  policies: NotificationPolicyInput[];
  fanoutSources: NotificationFanoutSourceInput[];
}): AppointmentNotificationOutboundContractEntry[] {
  const enabledPolicies = input.policies.filter((policy) => policy.enabled);
  const governedSources = input.fanoutSources.filter((source) => source.status !== "active").length;
  const emittedTargets = new Set(input.fanoutSources.flatMap((source) => source.notificationLabels)).size;

  const adapters: AppointmentIntegrationAdapter[] = ["sms", "email", "calendar", "crm", "dms"];

  return adapters.map((adapter) => ({
    id: `outbound-${adapter}`,
    adapter,
    adapterLabel: adapterLabel(adapter),
    versionLabel: "v1.notification-outbound",
    eventLabel: `appointment.notification.outbound.${adapter}.v1`,
    deliveryKeyLabel: `${input.appointmentId}:${adapter}:correlation-id`,
    redactionLabel:
      adapter === "calendar"
        ? "Redacted customer + vehicle detail with safe time/place payload"
        : adapter === "crm"
          ? "Customer-safe payload with internal board identifiers only"
          : adapter === "dms"
            ? "Operational payload with stock + appointment correlation only"
            : "No sensitive notes or complaint text leave the board contract",
    statusLabel: enabledPolicies.length > 0 ? "Ready for adapter" : "Policy coverage required",
    detail: `${enabledPolicies.length} enabled notification policy rule${
      enabledPolicies.length === 1 ? "" : "s"
    }, ${emittedTargets} target stream${emittedTargets === 1 ? "" : "s"}, and ${governedSources} governed suppression decision${
      governedSources === 1 ? "" : "s"
    } are represented in the outbound contract surface.`,
    actionLabel: "Review outbound contract"
  }));
}

export function buildAppointmentNotificationInboundContracts(input: {
  policies: NotificationPolicyInput[];
}): AppointmentNotificationInboundContractEntry[] {
  const managerTimelinePolicy =
    input.policies.find((policy) => policy.deepLinkTarget === "manager-timeline")?.label ?? "Manager Inbox";
  const resolutionPolicy =
    input.policies.find((policy) => policy.deepLinkTarget === "resolution-workbench")?.label ??
    "Delivery Failures";

  return [
    {
      id: "inbound-acknowledge",
      commandLabel: "Acknowledge notification delivery",
      versionLabel: "v1.notification-inbound",
      routingLabel: managerTimelinePolicy,
      idempotencyLabel: "adapter-delivery-id + appointment id",
      actorLabel: "Manager or trusted adapter",
      conflictLabel: "Reject stale acknowledgement against closed or superseded runtime state",
      actionLabel: "Review inbound command"
    },
    {
      id: "inbound-replay",
      commandLabel: "Replay suppressed or deduped notification",
      versionLabel: "v1.notification-inbound",
      routingLabel: resolutionPolicy,
      idempotencyLabel: "adapter-replay-id + fanout source id",
      actorLabel: "Manager or automation supervisor",
      conflictLabel: "Replay only if the source still exists and suppression state matches",
      actionLabel: "Review inbound command"
    },
    {
      id: "inbound-resolve-failure",
      commandLabel: "Resolve delivery failure",
      versionLabel: "v1.notification-inbound",
      routingLabel: resolutionPolicy,
      idempotencyLabel: "adapter-resolution-id + failure id",
      actorLabel: "Manager or recovery adapter",
      conflictLabel: "Refuse duplicate resolution after the queue already moved to closed state",
      actionLabel: "Review inbound command"
    }
  ];
}

export function buildAppointmentNotificationContractHarness(input: {
  outboundContracts: AppointmentNotificationOutboundContractEntry[];
  inboundContracts: AppointmentNotificationInboundContractEntry[];
}): AppointmentNotificationContractHarnessResult[] {
  return input.outboundContracts.map((contract) => {
    const requiresReview = contract.adapter === "sms" || contract.adapter === "calendar";

    return {
      id: `harness-${contract.adapter}`,
      adapterLabel: contract.adapterLabel,
      directionLabel: `${input.inboundContracts.length} inbound / outbound ready`,
      status: requiresReview ? "warning" : "ready",
      tone: requiresReview ? "amber" : "green",
      detail: requiresReview
        ? `${contract.adapterLabel} still needs stricter consent or scheduling review before a live adapter can be plugged in, but the versioned contract surface is ready.`
        : `${contract.adapterLabel} can attach to the versioned fake harness without changing Appointment Board runtime semantics.`,
      actionLabel: "Review harness"
    };
  });
}
