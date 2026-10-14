"use client";

import dynamic from "next/dynamic";
// Load the workspace styles with the route, not only its deferred client chunk.
// This keeps List/Board styled during client navigation and development refreshes.
import "@/features/tasks/compact-tasks-workspace.module.css";

import type { TasksConsoleScreenProps } from "@/features/tasks/tasks-console-screen";

const TasksConsoleScreen = dynamic(
  () =>
    import("@/features/tasks/compact-tasks-workspace").then(
      (module) => module.TasksWorkspace
    ),
  {
    loading: () => <TasksConsoleLoadingState />,
    ssr: false
  }
);

function TasksConsoleLoadingState() {
  return (
    <main aria-label="Loading Tasks console" className="console-client-loading" role="status">
      <div className="console-client-loading-heading">
        <span className="console-route-loading-line console-route-loading-line-title" />
        <span className="console-route-loading-line console-route-loading-line-copy" />
      </div>
      <div className="console-client-loading-toolbar" />
      <div className="console-client-loading-grid">
        <div className="console-client-loading-panel console-client-loading-panel-wide" />
        <div className="console-client-loading-panel" />
      </div>
      <span className="sr-only">Loading task workspace...</span>
    </main>
  );
}

export function TasksConsoleLoader(props: TasksConsoleScreenProps) {
  return <TasksConsoleScreen key={[props.consoleBaseHref, props.initialQueueFilter, props.initialDepartmentFilter, props.initialOwnerFilter, props.initialView, props.initialPage].join(":")} {...props} />;
}
