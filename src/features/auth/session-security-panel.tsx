"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SessionSummary = {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

type SessionSecurityPanelProps = {
  initialCurrentSession: SessionSummary | null;
  initialSessions: SessionSummary[];
};

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function countOtherSessions(sessions: SessionSummary[]) {
  return sessions.filter((session) => !session.isCurrent).length;
}

export function SessionSecurityPanel({ initialCurrentSession, initialSessions }: SessionSecurityPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentSession, setCurrentSession] = useState(initialCurrentSession);
  const [sessions, setSessions] = useState(initialSessions);
  const [message, setMessage] = useState({ error: "", success: "" });
  const otherSessionCount = countOtherSessions(sessions);

  function signOutOtherSessions() {
    setMessage({ error: "", success: "" });

    startTransition(async () => {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as {
        closedCount?: number;
        currentSession?: SessionSummary | null;
        error?: string;
        sessions?: SessionSummary[];
      } | null;

      if (!response.ok || !payload) {
        setMessage({ error: payload?.error ?? "Unable to close other sign-ins right now.", success: "" });
        return;
      }

      setCurrentSession(payload.currentSession ?? null);
      setSessions(payload.sessions ?? []);
      setMessage({
        error: "",
        success: payload.closedCount
          ? `${payload.closedCount} other sign-in${payload.closedCount === 1 ? "" : "s"} closed.`
          : "No other sign-ins were open."
      });
      router.refresh();
    });
  }

  return (
    <section className="panel-card auth-session-panel">
      <strong>Current sign-in</strong>
      <h2>Control where this account is open</h2>
      <div className="settings-summary-grid">
        <div className="settings-summary-card">
          <span>This device</span>
          <strong>{currentSession ? "Active" : "Unknown"}</strong>
          <small>{currentSession ? `Started ${formatSessionDate(currentSession.createdAt)}` : "Sign in again if this looks wrong"}</small>
        </div>
        <div className="settings-summary-card">
          <span>Other sign-ins</span>
          <strong>{otherSessionCount}</strong>
          <small>{otherSessionCount ? "Can be closed without signing out here" : "Only this device is active"}</small>
        </div>
        <div className="settings-summary-card">
          <span>Session expires</span>
          <strong>{currentSession ? formatSessionDate(currentSession.expiresAt) : "Unknown"}</strong>
          <small>The system will ask for login again after this time.</small>
        </div>
      </div>

      {message.error ? (
        <div className="notice notice-danger" role="alert">
          <p>{message.error}</p>
        </div>
      ) : null}
      {message.success ? (
        <div className="notice" role="status">
          <p>{message.success}</p>
        </div>
      ) : null}

      <div className="form-actions">
        <button className="pill pill-primary" disabled={isPending || otherSessionCount === 0} onClick={signOutOtherSessions} type="button">
          {isPending ? "Closing..." : "Sign out everywhere else"}
        </button>
      </div>
    </section>
  );
}
