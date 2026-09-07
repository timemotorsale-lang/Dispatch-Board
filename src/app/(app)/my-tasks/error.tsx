"use client";

import { useEffect } from "react";

import { ErrorStateCard, RetryStateAction } from "@/components/ui/state-card";

type MyTasksErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function MyTasksError({ error, reset }: MyTasksErrorProps) {
  useEffect(() => {
    const retryKey = `my-tasks-auto-retry:${window.location.pathname}${window.location.search}:${error.digest ?? error.message}`;
    if (window.sessionStorage.getItem(retryKey)) return;

    window.sessionStorage.setItem(retryKey, "1");
    const retryTimer = window.setTimeout(() => {
      reset();
    }, 600);

    return () => window.clearTimeout(retryTimer);
  }, [error.digest, error.message, reset]);

  return (
    <div className="page-shell">
      <ErrorStateCard
        actions={[
          RetryStateAction({ label: "Retry My Tasks", onClick: reset }),
          { href: "/tasks", label: "Open full Tasks", tone: "secondary" },
          { href: "/board", label: "Open Dispatch Board", tone: "secondary" }
        ]}
        eyebrow="My Tasks temporarily unavailable"
        message="My Tasks could not finish loading. The console retries once automatically; your saved work has not been changed. Retry this view, open the full Tasks console, or return to the Dispatch Board."
        title="Couldn't open My Tasks"
      />
    </div>
  );
}
