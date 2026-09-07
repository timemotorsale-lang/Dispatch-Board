import { createHash, randomUUID } from "crypto";

import type { GrowthAudienceRow, GrowthOpportunityReadModel } from "./read-model";

export type GrowthCampaignStatus = "Draft" | "Approval requested";

export type GrowthCampaignPlan = {
  approvalRequestedAt: string | null;
  audienceSnapshots: GrowthAudienceSnapshot[];
  budgetCents: number;
  channel: "Email" | "SMS draft" | "Phone task" | "Paid ads" | "Social" | "Website";
  createdAt: string;
  id: string;
  messageDrafts: GrowthMessageDraft[];
  objective: string;
  opportunityTitle: string;
  owner: string;
  status: GrowthCampaignStatus;
  updatedAt: string;
  version: number;
  versions: GrowthCampaignPlanVersion[];
};

export type GrowthAudienceSnapshot = {
  createdAt: string;
  id: string;
  rows: GrowthAudienceRow[];
  version: number;
};

export type GrowthMessageDraft = {
  body: string;
  callToAction: string;
  createdAt: string;
  id: string;
  subject: string;
  version: number;
};

export type GrowthCampaignPlanVersion = {
  change: string;
  createdAt: string;
  id: string;
  version: number;
};

export type GrowthCampaignCommand = {
  idempotencyKey: string;
  reason: string;
};

export type CreateGrowthCampaignPlanInput = GrowthCampaignCommand & {
  budgetCents: number;
  channel: GrowthCampaignPlan["channel"];
  objective: string;
  opportunity: GrowthOpportunityReadModel;
};

export type SaveGrowthAudienceSnapshotInput = GrowthCampaignCommand & {
  expectedVersion: number;
  planId: string;
  rows: GrowthAudienceRow[];
};

export type EditGrowthMessageDraftInput = GrowthCampaignCommand & {
  body: string;
  callToAction: string;
  expectedVersion: number;
  planId: string;
  subject: string;
};

export type RequestGrowthApprovalInput = GrowthCampaignCommand & {
  expectedVersion: number;
  planId: string;
};

type IdempotencyRecord = {
  hash: string;
  response: GrowthCampaignPlan;
};

function hashCommand(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertCommand(command: GrowthCampaignCommand) {
  if (!command.idempotencyKey.trim()) throw new Error("Idempotency key is required.");
  if (command.reason.trim().length < 10) throw new Error("Reason must explain the business purpose.");
}

function clonePlan(plan: GrowthCampaignPlan): GrowthCampaignPlan {
  return {
    ...plan,
    audienceSnapshots: plan.audienceSnapshots.map((snapshot) => ({ ...snapshot, rows: snapshot.rows.map((row) => ({ ...row })) })),
    messageDrafts: plan.messageDrafts.map((draft) => ({ ...draft })),
    versions: plan.versions.map((version) => ({ ...version }))
  };
}

export function createGrowthCampaignPlanningService(now = () => new Date()) {
  const plans = new Map<string, GrowthCampaignPlan>();
  const idempotency = new Map<string, IdempotencyRecord>();

  function idempotent<T extends GrowthCampaignCommand>(commandName: string, input: T, execute: () => GrowthCampaignPlan) {
    assertCommand(input);
    const key = `${commandName}:${input.idempotencyKey}`;
    const hash = hashCommand(input);
    const prior = idempotency.get(key);
    if (prior) {
      if (prior.hash !== hash) throw new Error("Idempotency key was reused with different campaign details.");
      return clonePlan(prior.response);
    }
    const response = execute();
    idempotency.set(key, { hash, response: clonePlan(response) });
    return clonePlan(response);
  }

  function appendVersion(plan: GrowthCampaignPlan, change: string) {
    const timestamp = now().toISOString();
    plan.version += 1;
    plan.updatedAt = timestamp;
    plan.versions.push({ change, createdAt: timestamp, id: randomUUID(), version: plan.version });
  }

  function getExisting(planId: string, expectedVersion: number) {
    const plan = plans.get(planId);
    if (!plan) throw new Error("Campaign plan was not found.");
    if (plan.version !== expectedVersion) throw new Error(`Campaign plan version must be ${plan.version}.`);
    return plan;
  }

  return {
    createCampaignPlan(input: CreateGrowthCampaignPlanInput) {
      return idempotent("createCampaignPlan", input, () => {
        if (input.opportunity.readiness === "Blocked") throw new Error("Blocked opportunities cannot become campaign plans.");
        if (input.budgetCents < 0) throw new Error("Budget cannot be negative.");
        const timestamp = now().toISOString();
        const plan: GrowthCampaignPlan = {
          approvalRequestedAt: null,
          audienceSnapshots: [],
          budgetCents: input.budgetCents,
          channel: input.channel,
          createdAt: timestamp,
          id: randomUUID(),
          messageDrafts: [],
          objective: input.objective,
          opportunityTitle: input.opportunity.title,
          owner: input.opportunity.owner,
          status: "Draft",
          updatedAt: timestamp,
          version: 1,
          versions: [{ change: "Campaign plan created", createdAt: timestamp, id: randomUUID(), version: 1 }]
        };
        plans.set(plan.id, plan);
        return plan;
      });
    },

    saveAudienceSnapshot(input: SaveGrowthAudienceSnapshotInput) {
      return idempotent("saveAudienceSnapshot", input, () => {
        const plan = getExisting(input.planId, input.expectedVersion);
        const timestamp = now().toISOString();
        plan.audienceSnapshots.push({ createdAt: timestamp, id: randomUUID(), rows: input.rows.map((row) => ({ ...row })), version: plan.audienceSnapshots.length + 1 });
        appendVersion(plan, "Audience snapshot saved");
        return plan;
      });
    },

    editMessageDraft(input: EditGrowthMessageDraftInput) {
      return idempotent("editMessageDraft", input, () => {
        const plan = getExisting(input.planId, input.expectedVersion);
        if (input.subject.trim().length < 4) throw new Error("Message subject is required.");
        if (input.body.trim().length < 20) throw new Error("Message body must explain the customer value.");
        if (input.callToAction.trim().length < 4) throw new Error("Call to action is required.");
        const timestamp = now().toISOString();
        plan.messageDrafts.push({
          body: input.body.trim(),
          callToAction: input.callToAction.trim(),
          createdAt: timestamp,
          id: randomUUID(),
          subject: input.subject.trim(),
          version: plan.messageDrafts.length + 1
        });
        appendVersion(plan, "Message draft edited");
        return plan;
      });
    },

    requestApproval(input: RequestGrowthApprovalInput) {
      return idempotent("requestApproval", input, () => {
        const plan = getExisting(input.planId, input.expectedVersion);
        if (plan.audienceSnapshots.length === 0) throw new Error("Audience snapshot is required before approval.");
        if (plan.messageDrafts.length === 0) throw new Error("Message or ad draft is required before approval.");
        plan.status = "Approval requested";
        plan.approvalRequestedAt = now().toISOString();
        appendVersion(plan, "Approval requested");
        return plan;
      });
    },

    getPlan(planId: string) {
      const plan = plans.get(planId);
      return plan ? clonePlan(plan) : null;
    }
  };
}
