"use client";

import { useEffect } from "react";

import { ErrorStateCard, RetryStateAction } from "@/components/ui/state-card";

type BoardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function BoardError({ error, reset }: BoardErrorProps) {
  useEffect(() => {
    const retryKey = `board-auto-retry:${window.location.pathname}${window.location.search}:${error.digest ?? error.message}`;
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
          RetryStateAction({ label: "Retry Dispatch Board", onClick: reset }),
          { href: "/command-center", label: "Open Command Center", tone: "secondary" },
          { href: "/my-tasks", label: "Open My Tasks", tone: "secondary" }
        ]}
        eyebrow="Dispatch Board temporarily unavailable"
        message="Dispatch Board could not finish loading. The console retries once automatically; your saved work has not been changed. Retry this page or open another daily workspace."
        title="Couldn't open Dispatch Board"
      />
    </div>
  );
}
