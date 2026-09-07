"use client";

import { useEffect } from "react";

import { ErrorStateCard, RetryStateAction } from "@/components/ui/state-card";

type CommandCenterErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CommandCenterError({ error, reset }: CommandCenterErrorProps) {
  useEffect(() => {
    const retryKey = `command-center-auto-retry:${window.location.pathname}${window.location.search}:${error.digest ?? error.message}`;
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
          RetryStateAction({ label: "Retry Command Center", onClick: reset }),
          { href: "/board", label: "Open Dispatch Board", tone: "secondary" },
          { href: "/manager-workspace", label: "Open Manager Workspace", tone: "secondary" }
        ]}
        eyebrow="Command Center temporarily unavailable"
        message="Command Center could not finish loading. The console retries once automatically; your saved work has not been changed. Retry this page or open one of the operating workspaces."
        title="Couldn't open Command Center"
      />
    </div>
  );
}
