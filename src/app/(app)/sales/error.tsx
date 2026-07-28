"use client";

import { ErrorStateCard, RetryStateAction } from "@/components/ui/state-card";

type SalesConsoleErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SalesConsoleError({ error, reset }: SalesConsoleErrorProps) {
  void error;

  return (
    <div className="page-shell">
      <ErrorStateCard
        actions={[
          RetryStateAction({ label: "Retry Sales Console", onClick: reset }),
          { href: "/sales", label: "Open Sales Console", tone: "secondary" },
          { href: "/board", label: "Open Dispatch Board", tone: "secondary" }
        ]}
        eyebrow="Sales console temporarily unavailable"
        message="The Sales Console could not finish loading its workspace. Your saved work has not been changed. Retry the Sales Console or return to the Dispatch Board."
        title="Couldn't open Sales Console"
      />
    </div>
  );
}
