"use client";

import { useState, useTransition } from "react";

import styles from "./growth-console-foundation.module.css";

type ApprovalDecisionControlsProps = {
  approvalId: string;
  campaignId: string;
};

export function GrowthApprovalDecisionControls({ approvalId, campaignId }: ApprovalDecisionControlsProps) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const canSubmit = reason.trim().length >= 12 && !isPending;

  function decide(decision: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/growth/campaigns/${campaignId}/approval-requests/${approvalId}`, {
        body: JSON.stringify({
          decision,
          idempotencyKey: `approval:${approvalId}:${decision.toLowerCase()}:${Date.now()}`,
          reason: reason.trim()
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error ?? "Could not record this approval decision.");
        return;
      }
      setMessage(decision === "APPROVED" ? "Approval recorded." : "Rejection recorded.");
      window.location.reload();
    });
  }

  return (
    <div className={styles.decisionBox}>
      <label>
        Decision reason
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain the approval, rejection, or missing correction."
          rows={3}
        />
      </label>
      <div className={styles.decisionActions}>
        <button type="button" onClick={() => decide("APPROVED")} disabled={!canSubmit}>Approve</button>
        <button type="button" onClick={() => decide("REJECTED")} disabled={!canSubmit}>Reject</button>
      </div>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
