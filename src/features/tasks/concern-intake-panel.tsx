"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";

type ConcernPreview = {
  intake: Record<string, unknown>;
  plan: {
    caseTitle: string;
    templateCode: string;
    classification: { reasonText: string };
    severity: { score: number; priority: string; escalationRequired: boolean; factors: Array<{ explanation: string }> };
    tasks: Array<{ stepCode: string; title: string; checklist: unknown[]; completionCriteria: string }>;
  };
  assignments: Array<{ stepCode: string; assignedUserName: string; dueAt: string; recommendationExplanation: string }>;
};

type CreatedPackage = {
  concern: { id: string; concernNumber: string; title: string; priority: string };
  tasks: Array<{ task: { id: string; title: string } }>;
};

type RecentPackage = CreatedPackage & { concern: CreatedPackage["concern"] & { status: string } };

export function ConcernIntakePanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const [preview, setPreview] = useState<ConcernPreview | null>(null);
  const [created, setCreated] = useState<CreatedPackage | null>(null);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<RecentPackage[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/concerns", { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : { concerns: [] })
      .then((result: { concerns?: RecentPackage[] }) => setRecent(result.concerns ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  function payloadFromForm() {
    if (!formRef.current) return null;
    const data = new FormData(formRef.current);
    return {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      customerReference: String(data.get("customerReference") ?? ""),
      vehicleReference: String(data.get("vehicleReference") ?? ""),
      daysOverdue: Number(data.get("daysOverdue") ?? 0),
      repeatContactCount: Number(data.get("repeatContactCount") ?? 0),
      missingDocumentation: data.get("missingDocumentation") === "on",
      managerSensitive: data.get("managerSensitive") === "on",
      moneyRisk: data.get("moneyRisk") === "on",
      source: "QUICK_LOG"
    };
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = payloadFromForm();
    if (!payload) return;
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/concerns/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null) as { preview?: ConcernPreview; error?: string } | null;
      if (!response.ok || !result?.preview) { setError(result?.error ?? "Unable to preview the concern."); return; }
      setPreview(result.preview);
    });
  }

  function handleCommit() {
    const payload = payloadFromForm();
    if (!payload) return;
    idempotencyKey.current ??= globalThis.crypto?.randomUUID?.() ?? `concern-${Date.now()}`;
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/concerns", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current ?? "" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null) as CreatedPackage & { error?: string } | null;
      if (!response.ok || !result?.concern) { setError(result?.error ?? "Unable to create the concern package."); return; }
      setCreated(result);
      setRecent((current) => [result as RecentPackage, ...current.filter((item) => item.concern.id !== result.concern.id)]);
      onCreated();
    });
  }

  return (
    <section className="panel-card concern-intake-panel" aria-label="Concern resolution intake">
      <header><div><strong>Concern-to-Task Engine</strong><span>Explain, preview, then generate a complete resolution package.</span></div><button aria-label="Close concern intake" className="tasks-console-rail-icon-button" onClick={onClose} type="button"><X size={15} /></button></header>
      {created ? (
        <div className="concern-created-state"><CheckCircle2 size={24} /><div><strong>{created.concern.concernNumber} created</strong><h2>{created.concern.title}</h2><p>{created.tasks.length} linked tasks were generated atomically.</p>{created.tasks[0] ? <Link className="pill pill-primary" href={`/tasks/${encodeURIComponent(created.tasks[0].task.id)}`}>Open first task</Link> : null}</div></div>
      ) : (
        <form ref={formRef} onSubmit={handlePreview}>
          <label><span>Concern title</span><input name="title" placeholder="Customer has not received title" required /></label>
          <label className="concern-wide"><span>Description</span><textarea name="description" placeholder="Describe what happened, what was promised, and how long it has been unresolved." required rows={3} /></label>
          <label><span>Customer</span><input name="customerReference" placeholder="Optional customer reference" /></label>
          <label><span>Vehicle / VIN</span><input name="vehicleReference" placeholder="Optional vehicle reference" /></label>
          <label><span>Days overdue</span><input min="0" name="daysOverdue" defaultValue="0" type="number" /></label>
          <label><span>Repeat contacts</span><input min="0" name="repeatContactCount" defaultValue="0" type="number" /></label>
          <div className="concern-checks"><label><input name="missingDocumentation" type="checkbox" /> Missing documentation</label><label><input name="moneyRisk" type="checkbox" /> Money risk</label><label><input name="managerSensitive" type="checkbox" /> Manager sensitive</label></div>
          {preview ? <section className="concern-preview" aria-label="Concern resolution preview"><header><div><small>{preview.plan.templateCode}</small><strong>{preview.plan.caseTitle}</strong><p>{preview.plan.classification.reasonText}</p></div><span className={`concern-priority concern-priority-${preview.plan.severity.priority.toLowerCase()}`}>{preview.plan.severity.priority} {preview.plan.severity.score}</span></header><ol>{preview.plan.tasks.map((task) => { const assignment = preview.assignments.find((item) => item.stepCode === task.stepCode); return <li key={task.stepCode}><span>{task.title}</span><small>{assignment?.assignedUserName} - {task.checklist.length} checks - due {assignment ? new Date(assignment.dueAt).toLocaleString() : "pending"}</small></li>; })}</ol>{preview.plan.severity.escalationRequired ? <p className="concern-escalation"><AlertTriangle size={14} /> Manager escalation deadline will be monitored.</p> : null}</section> : null}
          <footer>{error ? <p className="tasks-console-inline-error">{error}</p> : null}<button className="pill pill-secondary" disabled={isPending} onClick={onClose} type="button">Cancel</button><button className="pill pill-secondary" disabled={isPending} type="submit">{isPending ? "Analyzing..." : "Preview workflow"}</button><button className="pill pill-primary" disabled={isPending || !preview} onClick={handleCommit} type="button">{isPending ? "Working..." : "Generate package"}</button></footer>
        </form>
      )}
      {recent.length ? <section className="concern-recent" aria-label="Recent concern packages"><strong>Recent concern packages</strong><div>{recent.slice(0, 4).map((item) => <article key={item.concern.id}><span>{item.concern.concernNumber} - {item.concern.priority}</span><b>{item.concern.title}</b><small>{item.tasks.length} tasks - {item.concern.status}</small>{item.tasks[0] ? <Link href={`/tasks/${encodeURIComponent(item.tasks[0].task.id)}`}>Open work</Link> : null}</article>)}</div></section> : null}
    </section>
  );
}
