"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, ClipboardCheck, FileText, Mail, MessageSquare, Phone } from "lucide-react";
import { useMemo, useState } from "react";

import styles from "./crm-next-shell.module.css";

const COMMUNICATION_ACTIONS = [
  { id: "call", label: "Phone Call", icon: Phone },
  { id: "sms", label: "Send SMS", icon: MessageSquare },
  { id: "email", label: "Send Email", icon: Mail }
] as const;

const INLINE_ACTIONS = [
  { id: "task", label: "Add CRM Task", icon: ClipboardCheck, prompt: "Type the task staff should complete for this customer.", defaultNote: "" },
  { id: "note", label: "Add Note", icon: FileText, prompt: "Record a quick customer note.", defaultNote: "Customer note:" },
  { id: "disposition", label: "Disposition", icon: CheckCircle2, prompt: "Record the customer outcome before moving the journey stage.", defaultNote: "Customer outcome:" }
] as const;

type InlineActionId = typeof INLINE_ACTIONS[number]["id"];

export function CrmNextInlineTaskComposer({
  appointmentHref,
  customerName,
  nextAction,
  owner
}: {
  appointmentHref: string;
  customerName: string;
  nextAction: string;
  owner: string;
}) {
  const [activeAction, setActiveAction] = useState<InlineActionId | null>(null);
  const [heldAction, setHeldAction] = useState<string | null>(null);
  const [taskNote, setTaskNote] = useState(nextAction);
  const [dueWindow, setDueWindow] = useState("Today");
  const [savedTask, setSavedTask] = useState<{ action: string; note: string } | null>(null);
  const canSave = taskNote.trim().length > 2;
  const action = INLINE_ACTIONS.find((item) => item.id === activeAction) ?? null;
  const saveLabel = action?.id === "task" ? "CRM Task" : action?.label;

  const savedSummary = useMemo(() => {
    if (!savedTask) return null;
    return `${savedTask.action}: ${savedTask.note} · ${dueWindow} · Owner: ${owner}`;
  }, [dueWindow, owner, savedTask]);

  function chooseAction(actionId: InlineActionId) {
    const next = INLINE_ACTIONS.find((item) => item.id === actionId) ?? INLINE_ACTIONS[0];
    setHeldAction(null);
    setActiveAction((current) => current === actionId ? null : actionId);
    setTaskNote(next.id === "task" ? nextAction : next.defaultNote);
  }

  return (
    <section className={styles.inlineTaskComposer} aria-label="Inline CRM action composer">
      <div className={styles.inlineActionBar} aria-label="CRM actions">
        {COMMUNICATION_ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setHeldAction(item.label)} type="button">
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
        <Link className={styles.appointmentInlineAction} href={appointmentHref}>
          <CalendarDays size={16} />
          Schedule Appt
        </Link>
        {INLINE_ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button aria-pressed={activeAction === item.id} key={item.id} onClick={() => chooseAction(item.id)} type="button">
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>
      {heldAction ? (
        <p className={styles.inlineActionNotice}>{heldAction} is not wired yet. It will connect here once the live communication provider is ready.</p>
      ) : null}
      {action ? (
        <div className={styles.inlineActionDrawer}>
          <header>
            <div>
              <strong>{action.label}</strong>
              <span>{action.prompt} Keep it on {customerName}&apos;s CRM record.</span>
            </div>
            <button onClick={() => setActiveAction(null)} type="button">Close</button>
          </header>
          <label>
            <span>{action.id === "task" ? "Task" : "Note / outcome"}</span>
            <textarea
              onChange={(event) => setTaskNote(event.target.value)}
              placeholder={action.prompt}
              rows={3}
              value={taskNote}
            />
          </label>
          <div className={styles.inlineTaskComposerRow}>
            <label>
              <span>Due</span>
              <select onChange={(event) => setDueWindow(event.target.value)} value={dueWindow}>
                <option>Today</option>
                <option>Tomorrow</option>
                <option>This week</option>
                <option>Next visit</option>
              </select>
            </label>
            <button disabled={!canSave} onClick={() => setSavedTask({ action: action.label, note: taskNote.trim() })} type="button">
              Save {saveLabel}
            </button>
          </div>
        </div>
      ) : null}
      {savedSummary ? <p className={styles.inlineTaskSaved}>{savedSummary}</p> : null}
    </section>
  );
}
