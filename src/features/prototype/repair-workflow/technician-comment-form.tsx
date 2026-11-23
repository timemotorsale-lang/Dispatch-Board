"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import styles from "./repair-workflow.module.css";

type CommentJob = { id: string; jobNumber: string; description: string };

export function TechnicianCommentForm({ repairOrderId, jobs, initialJobId }: {
  repairOrderId: string;
  jobs: CommentJob[];
  initialJobId?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialJobId ?? jobs[0]?.id);
  const job = jobs.find(item => item.id === selected) ?? jobs[0];
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const pending = useRef<{ jobId: string; finding: string; idempotencyKey: string; occurredAt: string } | null>(null);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finding = comment.trim();
    if (!job || !finding || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    if (pending.current?.jobId !== job.id || pending.current?.finding !== finding) {
      pending.current = { jobId: job.id, finding, idempotencyKey: crypto.randomUUID(), occurredAt: new Date().toISOString() };
    }
    try {
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/planning`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REPORT_TECHNICIAN_FINDING", ...pending.current }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "The comment could not be sent. Try again.");
      pending.current = null;
      setComment("");
      setNotice(`Comment for ${job.jobNumber} sent to the advisor.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The comment could not be sent. Try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (!job) return null;
  return <form className={styles.form} aria-label="Technician comment" onSubmit={send}>
    {jobs.length > 1 && <label>Job<select aria-label="Job for comment" value={job.id} onChange={event => setSelected(event.target.value)} disabled={busy}>
      {jobs.map(item => <option key={item.id} value={item.id}>{item.jobNumber} · {item.description}</option>)}
    </select></label>}
    <label>Message to advisor<textarea rows={2} maxLength={1000} required disabled={busy} value={comment}
      placeholder="Ask a question, flag a blocker, or leave a recommendation."
      onChange={event => setComment(event.target.value)} /></label>
    <button type="submit" disabled={busy || !comment.trim()}>{busy ? "Sending…" : "Send comment"}</button>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </form>;
}
