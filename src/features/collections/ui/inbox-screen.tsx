"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { getInbox } from "../server/messaging-service";
import { useAccountAction } from "./account-workspace";
import { formatWhen, label } from "./client-api";
import styles from "./collections.module.css";

type Inbox = Awaited<ReturnType<typeof getInbox>>;

export function InboxScreen({ inbox }: { inbox: Inbox }) {
  const selected = inbox.selected;
  return (
    <div className={styles.split}>
      <section className={styles.panel} aria-label="Conversations">
        <h2>Conversations</h2>
        {inbox.threads.length === 0 ? <p className={styles.muted}>No customer texts yet.</p> : (
          <ul className={styles.timeline}>
            {inbox.threads.map(t => (
              <li key={t.key}>
                <Link href={`/collections/inbox?thread=${encodeURIComponent(t.key)}`} aria-current={selected?.key === t.key ? "page" : undefined}>
                  <strong>{t.title}</strong>
                </Link>{" "}
                {t.unread ? <span className={`${styles.badge} ${styles.badgeBad}`}>{t.unread} unread</span> : null}
                <br /><span className={styles.muted}>{t.subtitle} · {formatWhen(t.lastAt)}</span>
                <br /><span>{t.lastText}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.panel} aria-label="Conversation">
        {selected ? <Thread inbox={inbox} /> : <p className={styles.muted}>Choose a conversation.</p>}
      </section>
    </div>
  );
}

function Thread({ inbox }: { inbox: Inbox }) {
  const selected = inbox.selected!;
  const accountId = selected.accountId ?? "";
  const { busy, run, feedback } = useAccountAction(accountId);
  const [templateKey, setTemplateKey] = useState("");
  const [body, setBody] = useState("");
  const unread = selected.unread;

  useEffect(() => {
    if (accountId && unread) void run("MARK_MESSAGES_READ", {});
    // Mark read once when the thread opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, unread]);

  return (
    <>
      <h2>{selected.title}</h2>
      <p className={styles.muted}>{selected.subtitle}{selected.accountId ? <> · <Link href={`/collections/accounts/${selected.accountId}`}>Open account</Link></> : null}</p>
      {feedback}
      <ul className={styles.timeline} aria-label="Messages">
        {inbox.messages.map(m => (
          <li key={m.id} style={{ textAlign: m.direction === "out" ? "right" : "left" }}>
            <span className={styles.muted}>{m.direction === "in" ? "Customer" : "Us"} · {formatWhen(m.at)}{m.status ? ` · ${label(m.status)}` : ""}</span>
            <br /><span style={{ whiteSpace: "pre-wrap" }}>{m.body}</span>
            {m.media ? <><br /><span className={styles.badge}>{m.media} photo{m.media === 1 ? "" : "s"} attached</span></> : null}
            {m.blockedReason ? <><br /><span className={styles.error}>Blocked: {m.blockedReason}</span></> : null}
          </li>
        ))}
      </ul>
      {selected.accountId ? (
        <form className={styles.form} onSubmit={event => { event.preventDefault(); void run("SEND_MESSAGE", { channel: "SMS", templateKey, body }, () => { setBody(""); setTemplateKey(""); }); }}>
          <label>Insert template<select value={templateKey} onChange={e => setTemplateKey(e.target.value)}>
            <option value="">None</option>
            {inbox.templateKeys.map(k => <option key={k} value={k}>{label(k)}</option>)}
          </select></label>
          <label className={styles.wide}>Reply<textarea rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder={templateKey ? "Leave empty to send the template" : "Type a reply"} /></label>
          <p className={`${styles.muted} ${styles.wide}`}>{inbox.sendingMode === "LIVE" ? "Replies are sent for real." : "Test mode: replies are saved as dry runs and not actually sent."} Every reply is checked against the send rules first.</p>
          <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy || (!body && !templateKey)}>{inbox.sendingMode === "LIVE" ? "Send reply" : "Save reply (dry run)"}</button></div>
        </form>
      ) : <p className={styles.muted}>This number isn&apos;t linked to an account. Add it as the phone number on the right account to reply from there.</p>}
    </>
  );
}
