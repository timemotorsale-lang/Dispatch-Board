"use client";

import { useState } from "react";

type BridgeState = "idle" | "creating" | "created" | "error";

export function CrmNextTaskBridgeControl({ attentionItemId, enabled }: { attentionItemId: string; enabled: boolean }) {
  const [state, setState] = useState<BridgeState>("idle");
  const [message, setMessage] = useState("");
  const [taskHref, setTaskHref] = useState("");

  async function createTask() {
    setState("creating");
    setMessage("");
    setTaskHref("");

    const response = await fetch("/api/crm-next/action-bridge", {
      body: JSON.stringify({
        attentionItemId,
        idempotencyKey: `crm-next-${attentionItemId}-${Date.now()}`,
        operation: "CREATE_DISPATCH_TASK"
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    const payload = await response.json().catch(() => null) as { error?: string; reason?: string; task?: { id?: string; title?: string } } | null;

    if (!response.ok || !payload?.task?.id) {
      setState("error");
      setMessage(payload?.error ?? "CRM Next could not create the Dispatch task.");
      return;
    }

    setState("created");
    setMessage(payload.reason ?? `Created Dispatch task: ${payload.task.title ?? "Customer follow-up"}.`);
    setTaskHref(`/tasks/${encodeURIComponent(payload.task.id)}`);
  }

  if (!enabled) {
    return (
      <div className="crm-next-bridge-control" data-state="held">
        <strong>Task creation is not available right now.</strong>
        <span>Use the existing Dispatch task workspace for this follow-up.</span>
      </div>
    );
  }

  return (
    <div className="crm-next-bridge-control" data-state={state}>
      <button disabled={state === "creating" || state === "created"} onClick={() => void createTask()} type="button">
        {state === "creating" ? "Creating Dispatch task..." : state === "created" ? "Dispatch task created" : "Create Dispatch task"}
      </button>
      {message ? <span role={state === "error" ? "alert" : "status"}>{message}</span> : <span>Creates a Dispatch task assigned to you.</span>}
      {taskHref ? <a href={taskHref}>Open created task</a> : null}
    </div>
  );
}
