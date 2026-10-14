import { createHash, randomUUID } from "crypto";

export type GrowthLedgerEventType =
  | "approval_requested"
  | "audience_saved"
  | "campaign_created"
  | "launch_locked"
  | "message_edited"
  | "review_completed";

export type GrowthLedgerCommand = {
  actor: string;
  idempotencyKey: string;
  reason: string;
};

export type GrowthLedgerRecord = {
  campaignId: string;
  createdAt: string;
  events: GrowthLedgerEvent[];
  latestVersion: number;
  title: string;
  versions: GrowthLedgerVersion[];
};

export type GrowthLedgerVersion = {
  createdAt: string;
  data: Record<string, unknown>;
  id: string;
  label: string;
  version: number;
};

export type GrowthLedgerEvent = {
  actor: string;
  createdAt: string;
  id: string;
  reason: string;
  type: GrowthLedgerEventType;
  version: number;
};

type IdempotencyRecord = {
  hash: string;
  response: GrowthLedgerRecord;
};

export function createGrowthCampaignLedger(now = () => new Date()) {
  const campaigns = new Map<string, GrowthLedgerRecord>();
  const idempotency = new Map<string, IdempotencyRecord>();

  function runIdempotent<TCommand extends GrowthLedgerCommand>(
    commandName: string,
    command: TCommand,
    execute: () => GrowthLedgerRecord
  ) {
    assertCommand(command);
    const key = `${commandName}:${command.idempotencyKey}`;
    const hash = hashCommand(command);
    const prior = idempotency.get(key);
    if (prior) {
      if (prior.hash !== hash) throw new Error("Idempotency key was reused with different ledger details.");
      return cloneRecord(prior.response);
    }

    const response = execute();
    idempotency.set(key, { hash, response: cloneRecord(response) });
    return cloneRecord(response);
  }

  function append(campaign: GrowthLedgerRecord, type: GrowthLedgerEventType, command: GrowthLedgerCommand, label: string, data: Record<string, unknown>) {
    const timestamp = now().toISOString();
    const version = campaign.latestVersion + 1;
    campaign.latestVersion = version;
    campaign.versions.push({ createdAt: timestamp, data: { ...data }, id: randomUUID(), label, version });
    campaign.events.push({ actor: command.actor, createdAt: timestamp, id: randomUUID(), reason: command.reason, type, version });
    return campaign;
  }

  return {
    appendAudienceSnapshot(command: GrowthLedgerCommand & { campaignId: string; counts: Record<string, number> }) {
      return runIdempotent("appendAudienceSnapshot", command, () => {
        const campaign = requireCampaign(campaigns, command.campaignId);
        return append(campaign, "audience_saved", command, "Audience snapshot saved", { counts: command.counts });
      });
    },

    appendLaunchLock(command: GrowthLedgerCommand & { campaignId: string; lockedReason: string }) {
      return runIdempotent("appendLaunchLock", command, () => {
        const campaign = requireCampaign(campaigns, command.campaignId);
        return append(campaign, "launch_locked", command, "Launch locked", { lockedReason: command.lockedReason });
      });
    },

    appendMessageDraft(command: GrowthLedgerCommand & { campaignId: string; subject: string }) {
      return runIdempotent("appendMessageDraft", command, () => {
        const campaign = requireCampaign(campaigns, command.campaignId);
        if (command.subject.trim().length < 4) throw new Error("Message subject is required.");
        return append(campaign, "message_edited", command, "Message draft edited", { subject: command.subject.trim() });
      });
    },

    createCampaign(command: GrowthLedgerCommand & { title: string }) {
      return runIdempotent("createCampaign", command, () => {
        if (command.title.trim().length < 4) throw new Error("Campaign title is required.");
        const timestamp = now().toISOString();
        const campaignId = randomUUID();
        const record: GrowthLedgerRecord = {
          campaignId,
          createdAt: timestamp,
          events: [{ actor: command.actor, createdAt: timestamp, id: randomUUID(), reason: command.reason, type: "campaign_created", version: 1 }],
          latestVersion: 1,
          title: command.title.trim(),
          versions: [{ createdAt: timestamp, data: { title: command.title.trim() }, id: randomUUID(), label: "Campaign created", version: 1 }]
        };
        campaigns.set(campaignId, record);
        return record;
      });
    },

    getCampaign(campaignId: string) {
      const campaign = campaigns.get(campaignId);
      return campaign ? cloneRecord(campaign) : null;
    },

    requestApproval(command: GrowthLedgerCommand & { campaignId: string }) {
      return runIdempotent("requestApproval", command, () => {
        const campaign = requireCampaign(campaigns, command.campaignId);
        return append(campaign, "approval_requested", command, "Approval requested", {});
      });
    }
  };
}

function assertCommand(command: GrowthLedgerCommand) {
  if (!command.actor.trim()) throw new Error("Actor is required.");
  if (!command.idempotencyKey.trim()) throw new Error("Idempotency key is required.");
  if (command.reason.trim().length < 10) throw new Error("Reason must explain the business purpose.");
}

function cloneRecord(record: GrowthLedgerRecord): GrowthLedgerRecord {
  return {
    ...record,
    events: record.events.map((event) => ({ ...event })),
    versions: record.versions.map((version) => ({ ...version, data: { ...version.data } }))
  };
}

function hashCommand(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requireCampaign(campaigns: Map<string, GrowthLedgerRecord>, campaignId: string) {
  const campaign = campaigns.get(campaignId);
  if (!campaign) throw new Error("Campaign ledger record was not found.");
  return campaign;
}
