"use client";

import { ErrorStateCard, RetryStateAction } from "@/components/ui/state-card";

type ProtectedConsoleErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProtectedConsoleError({ error, reset }: ProtectedConsoleErrorProps) {
  void error;

  return (
    <div className="page-shell">
      <ErrorStateCard
        actions={[
          RetryStateAction({ label: "Retry console", onClick: reset }),
          { href: "/board", label: "Open Dispatch Board", tone: "secondary" }
        ]}
        eyebrow="Console temporarily unavailable"
        message="The console could not complete its data request. Your saved work has not been changed. Retry the console or return to the Dispatch Board."
        title="Couldn't open this console"
      />
    </div>
  );
}
