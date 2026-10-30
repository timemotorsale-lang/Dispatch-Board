"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveUserSummary } from "@/server/services/user-summary";
import type { TaskReadModel } from "@/server/services/task-read";
import type { DispatchTeam } from "@/lib/dispatch-team";

export function TaskHandoffPanel({ task, people }: { task: TaskReadModel; people: ActiveUserSummary[] }) {
  const [team, setTeam] = useState<DispatchTeam | null>(null), [receiver, setReceiver] = useState("");
  const [next, setNext] = useState(""), [reason, setReason] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [retry, setRetry] = useState<Record<string, unknown> | null>(null);
  const request = useRef<Record<string, unknown> | null>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/dispatch/team", { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Handoffs are unavailable.");
    setTeam(body);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load().catch(failure => setError(failure.message)); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function run(values: Record<string, unknown>) {
    if (!team || busy) return;
    const payload = retry ?? { ...values, date: team.today, idempotencyKey: crypto.randomUUID() };
    request.current = payload; setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/dispatch/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
      const body = await response.json();
      if (!response.ok) {
        if (response.status >= 500) setRetry(payload); else { setRetry(null); request.current = null; }
        throw new Error(body.error ?? "The handoff could not be saved.");
      }
      request.current = null; setRetry(null); setNotice("Handoff updated."); await load();
    } catch (failure) {
      if (request.current) setRetry(request.current);
      setError(failure instanceof Error ? failure.message : "The handoff could not be confirmed.");
    } finally { setBusy(false); }
  }
  const pending = team?.handoffs.find(item => item.taskId === task.id);
  const ownerId = task.ownerUser?.id ?? task.assignedUser.id;
  return <section aria-label="Accepted work handoff" className="task-comments-panel">
    <h3>Hand off work</h3>
    {error ? <p role="alert">{error}</p> : null}{notice ? <p role="status">{notice}</p> : null}
    {retry ? <button disabled={busy} onClick={() => void run(retry)}>Retry same handoff update</button> : null}
    {pending ? <div><p>{pending.sender} to {pending.receiver}</p><p>Next action: {pending.nextAction}</p>
      <label className="field"><span>Decision note</span><input maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Required when declining" /></label>
      {team?.actorUserId === pending.receiverUserId ? <div className="my-task-actions"><button disabled={busy || Boolean(retry)} onClick={() => void run({ action: "ACCEPT_HANDOFF", handoffId: pending.id, expectedVersion: pending.version, reason })}>Accept handoff</button><button disabled={busy || Boolean(retry) || !reason.trim()} onClick={() => void run({ action: "DECLINE_HANDOFF", handoffId: pending.id, expectedVersion: pending.version, reason })}>Decline</button></div> : null}
      {team?.actorUserId === pending.senderUserId || team?.canManage ? <button disabled={busy || Boolean(retry)} onClick={() => void run({ action: "CANCEL_HANDOFF", handoffId: pending.id, expectedVersion: pending.version, reason })}>Cancel handoff</button> : null}
      <p>Ownership stays with {pending.sender} until accepted.</p>
    </div> : team && (team.actorUserId === ownerId || team.canManage) && task.status !== "COMPLETED" ? <form onSubmit={event => { event.preventDefault(); void run({ action: "REQUEST_HANDOFF", taskId: task.id, expectedTaskUpdatedAt: task.updatedAt, receiverUserId: receiver, nextAction: next, expectedVersion: 0 }); }}>
      <label className="field"><span>Receiving person</span><select required value={receiver} onChange={event => setReceiver(event.target.value)}><option value="">Choose a person</option>{people.filter(person => person.id !== ownerId).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      <label className="field"><span>Next action</span><textarea required maxLength={500} value={next} onChange={event => setNext(event.target.value)} /></label>
      <button className="pill pill-primary" disabled={busy || Boolean(retry)}>Request handoff</button>
    </form> : <p>No handoff is pending.</p>}
  </section>;
}
