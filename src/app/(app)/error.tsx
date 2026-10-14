"use client";

import { useEffect } from "react";

import { ErrorStateCard, RetryStateAction } from "@/components/ui/state-card";

type ProtectedConsoleErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProtectedConsoleError({ error, reset }: ProtectedConsoleErrorProps) {
  useEffect(() => {
    const retryKey = `protected-console-auto-retry:${window.location.pathname}${window.location.search}:${error.digest ?? error.message}`;
    const retryState = window.sessionStorage.getItem(retryKey);
    const parsed = retryState ? JSON.parse(retryState) as { attempts?: number; lastAttemptAt?: number } : null;
    const recentAttempts = parsed?.lastAttemptAt && Date.now() - parsed.lastAttemptAt < 15_000 ? parsed.attempts ?? 0 : 0;
    if (recentAttempts >= 3) return;

    window.sessionStorage.setItem(retryKey, JSON.stringify({ attempts: recentAttempts + 1, lastAttemptAt: Date.now() }));
    const retryTimer = window.setTimeout(() => {
      reset();
    }, 700 + recentAttempts * 900);

    return () => window.clearTimeout(retryTimer);
  }, [error.digest, error.message, reset]);

  function retryConsole() {
    const prefix = `protected-console-auto-retry:${window.location.pathname}${window.location.search}:`;
    Object.keys(window.sessionStorage).filter((key) => key.startsWith(prefix)).forEach((key) => window.sessionStorage.removeItem(key));
    window.location.reload();
  }

  return (
    <div className="page-shell">
      <ErrorStateCard
        actions={[
          RetryStateAction({ label: "Retry console", onClick: retryConsole }),
          { href: "/board", label: "Open Dispatch Board", tone: "secondary" }
        ]}
        eyebrow="Console temporarily unavailable"
        message="The console could not complete its data request. It retries once automatically. Your saved work has not been changed. Retry the console or return to the Dispatch Board."
        title="Couldn't open this console"
      />
    </div>
  );
}
