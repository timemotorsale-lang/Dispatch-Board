"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, ClipboardCheck, FileText, Mail, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import { CrmNextDirectActionForm } from "./crm-next-direct-action-form";
import styles from "./crm-next-shell.module.css";

const COMMUNICATION_ACTIONS = [
  { id: "call", label: "Phone Call", icon: Phone },
  { id: "sms", label: "Send SMS", icon: MessageSquare },
  { id: "email", label: "Send Email", icon: Mail }
] as const;

const INLINE_ACTIONS = [
  { id: "task", label: "Add CRM Task", icon: ClipboardCheck },
  { id: "note", label: "Add Note", icon: FileText },
  { id: "disposition", label: "Record outcome note", icon: CheckCircle2 }
] as const;

type InlineActionId = typeof INLINE_ACTIONS[number]["id"];

export function CrmNextInlineTaskComposer({
  appointmentHref, customerId, customerName, nextAction, owner
}: {
  appointmentHref: string;
  customerId?: string;
  customerName: string;
  nextAction: string;
  owner: string;
}) {
  const [activeAction, setActiveAction] = useState<InlineActionId | null>(null);
  const [heldAction, setHeldAction] = useState<string | null>(null);
  const action = INLINE_ACTIONS.find((item) => item.id === activeAction);
  const customerHref = customerId ? `/crm-next/customers/${encodeURIComponent(customerId)}` : "/crm-next/customers";
  return (
    <section className={styles.inlineTaskComposer} aria-label="Inline CRM action composer">
      <div className={styles.inlineActionBar} aria-label="CRM actions">
        {COMMUNICATION_ACTIONS.map((item) => {
          const Icon = item.icon;
          return <button key={item.id} onClick={() => setHeldAction(item.label)} type="button"><Icon size={16} />{item.label}</button>;
        })}
        <Link className={styles.appointmentInlineAction} href={appointmentHref}><CalendarDays size={16} />Schedule Appt</Link>
        {INLINE_ACTIONS.map((item) => {
          const Icon = item.icon;
          return <button aria-pressed={activeAction === item.id} key={item.id} onClick={() => { setHeldAction(null); setActiveAction((current) => current === item.id ? null : item.id); }} type="button"><Icon size={16} />{item.label}</button>;
        })}
      </div>
      {heldAction ? <p className={styles.inlineActionNotice}>{heldAction} needs a configured communication provider. No message was sent. Use Add Note to record a call or follow-up made outside the app.</p> : null}
      {action ? (
        <div className={styles.inlineActionDrawer}>
          <header><div><strong>{action.label}</strong><span>{customerName} · Owner: {owner}</span></div><button onClick={() => setActiveAction(null)} type="button">Close</button></header>
          <CrmNextDirectActionForm
            key={action.id}
            actionId={action.id === "task" ? "new-task" : "add-note"}
            cancelHref={customerHref}
            customerId={customerId}
            customerName={customerName}
            disabled={!customerId}
            fields={action.id === "task" ? [{ label: "Task", placeholder: nextAction }, { label: "Due", placeholder: "Choose due date" }] : [{ label: "Note", placeholder: action.id === "disposition" ? "Record the customer outcome and next agreed step. This note does not change the lifecycle stage." : "Record a customer note." }]}
            nextAction={nextAction}
            saveLabel={action.id === "task" ? "Save CRM Task" : "Save Note"}
            successMessage={action.id === "task" ? "CRM task saved to the customer timeline and your staff queue." : action.id === "disposition" ? "Outcome note saved. Customer lifecycle stage is unchanged." : "Note saved to the customer timeline."}
          />
        </div>
      ) : null}
    </section>
  );
}
