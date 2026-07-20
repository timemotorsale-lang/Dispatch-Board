"use client";

import dynamic from "next/dynamic";

import type { TasksConsoleScreenProps } from "@/features/tasks/tasks-console-screen";

const TasksConsoleScreen = dynamic(
  () =>
    import("@/features/tasks/tasks-console-screen").then(
      (module) => module.TasksConsoleScreen
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
  return <TasksConsoleScreen {...props} />;
}
