"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { TimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";

import styles from "./time-attendance-console.module.css";

type TimeAttendanceInboxDrawerProps = {
  notifications: TimeAttendanceConsoleModel["notifications"];
};

export function TimeAttendanceInboxDrawer({ notifications }: TimeAttendanceInboxDrawerProps) {
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const unreadCount = notifications.filter((notice) => notice.unread).length;
  const criticalCount = notifications.filter((notice) => notice.severity === "CRITICAL").length;

  function closeDrawer() {
    setOpen(false);
    window.setTimeout(() => openButtonRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!notifications.length) return null;

  return (
    <>
      <article className={styles.inboxLauncher}>
        <div>
          <span className={styles.sectionEyebrow}>Internal inbox</span>
          <h2>Time & Attendance notices</h2>
          <p>{unreadCount} unread · {criticalCount} critical</p>
        </div>
        <button onClick={() => setOpen(true)} ref={openButtonRef} type="button">
          <Bell size={16} aria-hidden="true" />
          Open
        </button>
      </article>

      {open ? (
        <div className={styles.inboxDrawerShell} role="presentation">
          <button aria-label="Close internal inbox" className={styles.inboxDrawerBackdrop} onClick={closeDrawer} type="button" />
          <aside className={styles.inboxDrawer} aria-label="Internal Time and Attendance inbox">
            <div className={styles.inboxDrawerHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Internal inbox</span>
                <h2>Time & Attendance notices</h2>
                <p>Recorded in the workspace only; no email or text delivery is claimed.</p>
              </div>
              <button aria-label="Close internal inbox" onClick={closeDrawer} type="button">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.inboxDrawerList}>
              {notifications.map((notice) => (
                <article className={styles.inboxNotice} key={notice.id}>
                  <div>
                    <strong>{notice.title}</strong>
                    <p>{notice.body}</p>
                    <small>{new Date(notice.createdAt).toLocaleString()}</small>
                  </div>
                  <span className={notice.severity === "CRITICAL" ? styles.chipDanger : notice.unread ? styles.chipWarning : styles.chipNeutral}>
                    {notice.unread ? "Unread" : "Read"}
                  </span>
                </article>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
