"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { getInbox } from "../server/messaging-service";
import { useAccountAction } from "./account-workspace";
import { formatWhen, label } from "./client-api";
import styles from "./collections.module.css";

type Inbox = Awaited<ReturnType<typeof getInbox>>;

function initials(name: string) {
  const parts = name.replace(/[^A-Za-z ]/g, " ").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

export function InboxScreen({ inbox }: { inbox: Inbox }) {
  const selected = inbox.selected;
  const unreadTotal = inbox.threads.reduce((sum, t) => sum + (t.unread || 0), 0);
  return (
    <div className={styles.inbox}>
      <section className={styles.inboxList} aria-labelledby="threads-h">
        <div className={styles.cardHead}><h2 id="threads-h">Conversations</h2>{unreadTotal ? <span className={`${styles.chip} ${styles.chipDanger}`}>{unreadTotal} unread</span> : null}</div>
        {inbox.threads.length === 0 ? <p className={styles.empty}>No customer texts yet.</p> : (
          <ul className={styles.threadList}>
            {inbox.threads.map(t => (
              <li key={t.key}>
                <Link className={`${styles.thread} ${t.unread ? styles.threadUnread : ""}`} href={`/collections/inbox?thread=${encodeURIComponent(t.key)}`} aria-current={selected?.key === t.key ? "page" : undefined}>
                  <span className={styles.avatar} aria-hidden="true">{initials(t.title)}</span>
                  <span className={styles.threadText}>
                    <span className={styles.threadTop}><strong>{t.title}</strong><span className={styles.callSub}>{formatWhen(t.lastAt)}</span></span>
                    <span className={styles.callSub}>{t.subtitle}</span>
                    <span className={styles.threadPreview}>{t.lastText}</span>
                  </span>
                  {t.unread ? <span className={styles.unreadDot}><span className={styles.srOnly}>{t.unread} unread</span><span aria-hidden="true">{t.unread}</span></span> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.inboxThread} aria-label="Conversation">
        {selected ? <Thread inbox={inbox} /> : <p className={styles.empty}>Choose a conversation on the left.</p>}
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
      <div className={styles.cardHead}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <span className={styles.avatar} aria-hidden="true">{initials(selected.title)}</span>
          <div style={{ minWidth: 0 }}><h2>{selected.title}</h2><span className={styles.callSub}>{selected.subtitle}</span></div>
        </div>
        {selected.accountId ? <Link className={styles.button} href={`/collections/accounts/${selected.accountId}`}>Open account</Link> : null}
      </div>
      <div style={{ padding: "0 16px" }}>{feedback}</div>
      <ul className={styles.bubbles} aria-label="Messages">
        {inbox.messages.map(m => (
          <li key={m.id} className={m.direction === "out" ? styles.bubbleOut : styles.bubbleIn}>
            <span className={styles.bubbleMeta}>{m.direction === "in" ? "Customer" : "Us"} · {formatWhen(m.at)}{m.status ? ` · ${label(m.status)}` : ""}</span>
            <div className={styles.bubble}>
              <span style={{ whiteSpace: "pre-wrap" }}>{m.body}</span>
              {m.media ? <><br /><span className={styles.badge}>{m.media} photo{m.media === 1 ? "" : "s"} attached</span></> : null}
            </div>
            {m.blockedReason ? <span className={styles.error} style={{ display: "block", marginTop: 4 }}>Blocked: {m.blockedReason}</span> : null}
          </li>
        ))}
      </ul>
      {selected.accountId ? (
        <form className={`${styles.form} ${styles.composer}`} onSubmit={event => { event.preventDefault(); void run("SEND_MESSAGE", { channel: "SMS", templateKey, body }, () => { setBody(""); setTemplateKey(""); }); }}>
          <label>Insert template<select value={templateKey} onChange={e => setTemplateKey(e.target.value)}>
            <option value="">None</option>
            {inbox.templateKeys.map(k => <option key={k} value={k}>{label(k)}</option>)}
          </select></label>
          <label className={styles.wide}>Reply<textarea rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder={templateKey ? "Leave empty to send the template" : "Type a reply"} /></label>
          <p className={`${styles.muted} ${styles.wide}`}>{inbox.sendingMode === "LIVE" ? "Replies are sent for real." : "Test mode: replies are saved as dry runs and not actually sent."} Every reply is checked against the send rules first.</p>
          <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy || (!body && !templateKey)}>{inbox.sendingMode === "LIVE" ? "Send reply" : "Save reply (dry run)"}</button></div>
        </form>
      ) : <p className={`${styles.muted} ${styles.composer}`}>This number isn&apos;t linked to an account. Add it as the phone number on the right account to reply from there.</p>}
    </>
  );
}
