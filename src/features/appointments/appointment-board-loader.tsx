"use client";

import dynamic from "next/dynamic";

import type { AppointmentBoardShellProps } from "@/features/appointments/appointment-board-shell";

const AppointmentBoardShell = dynamic(
  () =>
    import("@/features/appointments/appointment-board-shell").then(
      (module) => module.AppointmentBoardShell
    ),
  {
    loading: () => <AppointmentBoardLoadingState />,
    ssr: false
  }
);

function AppointmentBoardLoadingState() {
  return (
    <main aria-label="Loading Appointments console" className="console-client-loading" role="status">
      <div className="console-client-loading-heading">
        <span className="console-route-loading-line console-route-loading-line-title" />
        <span className="console-route-loading-line console-route-loading-line-copy" />
      </div>
      <div className="console-client-loading-toolbar" />
      <div className="console-client-loading-grid">
        <div className="console-client-loading-panel" />
        <div className="console-client-loading-panel console-client-loading-panel-wide" />
      </div>
      <span className="sr-only">Loading appointment workspace...</span>
    </main>
  );
}

export function AppointmentBoardLoader(props: AppointmentBoardShellProps) {
  return <AppointmentBoardShell {...props} />;
}
