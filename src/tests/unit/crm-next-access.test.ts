import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { previewCrmNextActionToTaskBridge } from "@/server/crm-next/action-bridge";
import { resolveCrmNextAccess, resolveCrmNextMode } from "@/server/crm-next/access";
import { getCrmNextCommandCenter } from "@/server/crm-next/read-model";

function user(roles: string[], isActive = true): AuthenticatedUser {
  return {
    id: `user-${roles.join("-").toLowerCase()}`,
    name: "CRM Next User",
    email: "crm-next@example.test",
    isActive,
    roles,
    duties: { all: [], direct: [], roleDefaults: [] }
  };
}

describe("CRM Next access and safe bridge", () => {
  const originalFlag = process.env.CRM_NEXT;

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.CRM_NEXT;
    else process.env.CRM_NEXT = originalFlag;
  });

  it("keeps CRM Next off unless the CRM_NEXT flag is explicitly enabled", () => {
    expect(resolveCrmNextMode({ flag: undefined })).toBe("OFF");
    expect(resolveCrmNextMode({ flag: "false" })).toBe("OFF");
    expect(resolveCrmNextMode({ flag: "REVIEW" })).toBe("REVIEW");
    expect(resolveCrmNextMode({ flag: "true" })).toBe("REVIEW");
  });

  it("allows an enabled manager without granting live task writes", () => {
    const access = resolveCrmNextAccess(user(["General Manager"]), { flag: "CRM_NEXT" });
    expect(access.allowed).toBe(false);

    const enabled = resolveCrmNextAccess(user(["General Manager"]), { flag: "REVIEW" });
    expect(enabled.allowed).toBe(true);

    process.env.CRM_NEXT = "REVIEW";
    const model = getCrmNextCommandCenter(user(["General Manager"]));
    expect(model.bridge.liveTaskCreationEnabled).toBe(false);
    expect(model.bridge.previewEnabled).toBe(true);
    expect(model.progress.envelopeCount).toBe(20);
    expect(model.progress.nextMilestone).toBe("CRMN-017");
    expect(model.progress.milestones.map((milestone) => milestone.status)).toContain("CONTRACTED");
  });

  it("rejects ineligible users and does not create a dispatch task from the bridge", () => {
    const denied = resolveCrmNextAccess(user(["Mechanic"]), { flag: "REVIEW" });
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("WORKSPACE_NOT_ELIGIBLE");

    process.env.CRM_NEXT = "REVIEW";
    const preview = previewCrmNextActionToTaskBridge(user(["General Manager"]), {
      attentionItemId: "attn-michael-overdue-follow-up"
    });

    expect(preview.state).toBe("PREVIEW_ONLY");
    expect(preview.liveTaskCreated).toBe(false);
    expect(preview.dispatchPreview?.customer360Update).toContain("would receive");
  });
});
