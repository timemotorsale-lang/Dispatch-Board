"use client";

import { useEffect, useState } from "react";

import { ErrorStateCard, RetryStateAction } from "@/components/ui/state-card";

type ProtectedConsoleErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProtectedConsoleError({ error, reset }: ProtectedConsoleErrorProps) {
  const [autoRetrying, setAutoRetrying] = useState(false);

  useEffect(() => {
    const retryKey = `protected-console-auto-retry:${window.location.pathname}${window.location.search}:${error.digest ?? error.message}`;
    if (window.sessionStorage.getItem(retryKey)) return;

    window.sessionStorage.setItem(retryKey, "1");
    setAutoRetrying(true);
    const retryTimer = window.setTimeout(() => {
      reset();
    }, 600);

    return () => window.clearTimeout(retryTimer);
  }, [error.digest, error.message, reset]);

  return (
    <div className="page-shell">
      <ErrorStateCard
        actions={[
          RetryStateAction({ label: "Retry console", onClick: reset }),
          { href: "/board", label: "Open Dispatch Board", tone: "secondary" }
        ]}
        eyebrow="Console temporarily unavailable"
        message={autoRetrying
          ? "The console hit a temporary loading issue. Retrying automatically now. Your saved work has not been changed."
          : "The console could not complete its data request. Your saved work has not been changed. Retry the console or return to the Dispatch Board."}
        title="Couldn't open this console"
      />
    </div>
  );
}
