"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { getTaskRepairHandoff } from "@/server/repair-order/task-handoff";

export type TaskServiceHandoff = NonNullable<Awaited<ReturnType<typeof getTaskRepairHandoff>>>;

export function TaskServiceHandoffSummary({ handoff }: { handoff: TaskServiceHandoff }) {
  if (handoff.repairOrderId) {
    return <p><strong>Handed off to Service</strong>{" · "}
      <Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(handoff.repairOrderId)}`}>
        Open repair order {handoff.repairOrderNumber}
      </Link>
    </p>;
  }
  return handoff.pending ? <p><strong>Awaiting Service check-in</strong>{" · "}{handoff.receiverName ?? "Receiving advisor"}</p> : null;
}

export function TaskServiceHandoffPanel({ taskId, handoff, canSchedule }: {
  taskId: string; handoff: TaskServiceHandoff; canSchedule: boolean;
}) {
  const router = useRouter();
  const [receivers, setReceivers] = useState<TaskServiceHandoff["receivers"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/api/tasks/${encodeURIComponent(taskId)}/service-handoff`;
  const intake = `/vehicles/repair-orders?serviceHandoff=${encodeURIComponent(taskId)}`;
  const appointment = new URLSearchParams({ action: "new", purpose: "repair", sourceTask: taskId, returnTo: `/tasks/${encodeURIComponent(taskId)}?tool=serviceHandoff` });

  useEffect(() => {
    if (!handoff.canRequest) return;
    const controller = new AbortController();
    void fetch(endpoint, { signal: controller.signal }).then(async response => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setReceivers(payload.receivers);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [endpoint, handoff.canRequest]);

  async function send(body: object) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error((await response.json()).error);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The handoff could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="task-comments-panel" aria-label="Service handoff">
    <TaskServiceHandoffSummary handoff={handoff} />
    {handoff.repairOrderId ? <p>The repair order now tracks the repair. Use the task’s normal completion or approval steps when any separate follow-up is finished.</p> : null}
    {handoff.pending ? <>
      <p style={{ whiteSpace: "pre-wrap" }}>{handoff.concern}</p>
      <p>The source task remains open until Service accepts this visit.</p>
      {handoff.canAccept ? <Link className="pill pill-primary" href={intake}>Continue to Service Intake</Link> : null}
      {canSchedule ? <Link className="pill pill-secondary" href={`/appointments?${appointment}`}>Schedule repair appointment</Link> : null}
      {handoff.canCancel ? <button type="button" disabled={busy} onClick={() => void send({ action: "cancel", requestToken: handoff.cancellationToken })}>Cancel pending handoff</button> : null}
    </> : null}
    {handoff.canRequest ? <form className="page-stack" onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      void send({ action: "request", receiverUserId: fields.get("receiver"), concern: fields.get("concern") });
    }}>
      <label className="field"><span>Receiving Service advisor</span>
        <select name="receiver" required defaultValue="">
          <option value="">{receivers === null ? "Loading Service advisors…" : "Choose a Service advisor"}</option>
          {receivers?.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
      </label>
      <label className="field"><span>Reported concerns and customer promises</span>
        <textarea name="concern" maxLength={2000} required defaultValue={handoff.concern} rows={5} />
      </label>
      <p>Review each reported concern before sending. Note any warranty request as pending until coverage is verified.</p>
      {receivers?.length === 0 ? <p>No authorized advisor is available for this location.</p> : null}
      <button className="pill pill-primary" disabled={busy || !receivers?.length}>Send to Service</button>
    </form> : null}
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
