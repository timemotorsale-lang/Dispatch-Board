export type GrowthAutomationCheckId =
  | "trigger"
  | "audience"
  | "message"
  | "frequency"
  | "owner"
  | "pause";

export type GrowthAutomationCheck = {
  id: GrowthAutomationCheckId;
  label: string;
  passed: boolean;
  nextAction: string;
};

export type GrowthAutomationActivationInput = {
  audienceApproved: boolean;
  frequencyCapPerContact: number;
  hasManualPause: boolean;
  messageApproved: boolean;
  ownerApproved: boolean;
  triggerReviewed: boolean;
};

export type GrowthAutomationActivationState =
  | "Ready inactive"
  | "Trigger review needed"
  | "Audience review needed"
  | "Message review needed"
  | "Frequency review needed"
  | "Owner approval needed"
  | "Pause control needed";

export type GrowthAutomationActivationReadiness = {
  checks: GrowthAutomationCheck[];
  canActivateAutomation: boolean;
  nextAction: string;
  state: GrowthAutomationActivationState;
};

const maxSafeFrequencyCapPerContact = 2;

export function evaluateGrowthAutomationActivation(input: GrowthAutomationActivationInput): GrowthAutomationActivationReadiness {
  const checks: GrowthAutomationCheck[] = [
    {
      id: "trigger",
      label: "Trigger reviewed",
      passed: input.triggerReviewed,
      nextAction: input.triggerReviewed ? "Trigger is ready" : "Review the event that starts this automation"
    },
    {
      id: "audience",
      label: "Audience approved",
      passed: input.audienceApproved,
      nextAction: input.audienceApproved ? "Audience is ready" : "Approve who enters and who is suppressed"
    },
    {
      id: "message",
      label: "Message approved",
      passed: input.messageApproved,
      nextAction: input.messageApproved ? "Message is ready" : "Approve customer-facing language and disclosure"
    },
    {
      id: "frequency",
      label: "Frequency cap safe",
      passed: input.frequencyCapPerContact > 0 && input.frequencyCapPerContact <= maxSafeFrequencyCapPerContact,
      nextAction:
        input.frequencyCapPerContact > 0 && input.frequencyCapPerContact <= maxSafeFrequencyCapPerContact
          ? "Contact limit is ready"
          : "Set contact limit to 1-2 touches per customer"
    },
    {
      id: "owner",
      label: "Owner approved",
      passed: input.ownerApproved,
      nextAction: input.ownerApproved ? "Owner is ready" : "Get manager approval before activation"
    },
    {
      id: "pause",
      label: "Manual pause available",
      passed: input.hasManualPause,
      nextAction: input.hasManualPause ? "Pause control is ready" : "Add a visible pause control before activation"
    }
  ];

  const failed = checks.find((check) => !check.passed);
  const canActivateAutomation = failed === undefined;

  return {
    canActivateAutomation,
    checks,
    nextAction: canActivateAutomation ? "Keep automation inactive until the user approves adoption" : failed.nextAction,
    state: canActivateAutomation ? "Ready inactive" : automationStateFor(failed.id)
  };
}

export function buildGrowthAutomationActivationReviewModel() {
  const readiness = evaluateGrowthAutomationActivation({
    audienceApproved: true,
    frequencyCapPerContact: 1,
    hasManualPause: true,
    messageApproved: false,
    ownerApproved: false,
    triggerReviewed: true
  });

  return {
    ...readiness,
    playbook: "Unsold quote recovery",
    summary:
      "The automation prepares follow-up work for staff. It cannot send customer messages until message approval, owner approval, and adoption review are complete.",
    touchLimit: "1 follow-up per customer",
    writeback: "Prepared task only"
  };
}

function automationStateFor(checkId: GrowthAutomationCheckId): GrowthAutomationActivationState {
  const states: Record<GrowthAutomationCheckId, GrowthAutomationActivationState> = {
    audience: "Audience review needed",
    frequency: "Frequency review needed",
    message: "Message review needed",
    owner: "Owner approval needed",
    pause: "Pause control needed",
    trigger: "Trigger review needed"
  };

  return states[checkId];
}
