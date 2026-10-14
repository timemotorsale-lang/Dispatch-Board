"use client";

import { ChevronDown, Circle, X } from "lucide-react";
import { TaskStatus } from "@prisma/client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { TaskStatusPanel } from "@/features/tasks/task-status-panel";
import type { TaskCompletionReadiness } from "@/server/services/task-execution-readiness";
import type { TaskReadModel } from "@/server/services/task-read";

export function TaskStatusBadge({ actorIsManager, canUpdate, currentStatus, onStatusChanged, readiness, task, tone }: {
  actorIsManager: boolean;
  canUpdate: boolean;
  currentStatus: TaskStatus;
  onStatusChanged: (status: TaskStatus) => void;
  readiness?: TaskCompletionReadiness | null;
  task: TaskReadModel;
  tone: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16, width: 480 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const label = currentStatus.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  const positionPanel = useCallback(() => {
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const width = Math.min(520, window.innerWidth - 32);
    setPosition({
      left: Math.max(16, Math.min(bounds.left, window.innerWidth - width - 16)),
      top: Math.max(16, Math.min(bounds.bottom + 8, window.innerHeight - 220)),
      width
    });
  }, []);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onScroll(event: Event) {
      if (!(event.target instanceof Node) || !panelRef.current?.contains(event.target)) positionPanel();
    }
    window.addEventListener("resize", positionPanel);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", positionPanel);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open, positionPanel]);

  return <>
    <button
      aria-controls={open ? panelId : undefined}
      aria-expanded={canUpdate ? open : undefined}
      aria-haspopup={canUpdate ? "dialog" : undefined}
      aria-label={`${canUpdate ? "Change task status" : "Task status"}: ${label}`}
      className={`task-status-badge etw-compact-state-${tone}`}
      disabled={!canUpdate}
      onClick={() => { if (!open) positionPanel(); setOpen(!open); }}
      ref={buttonRef}
      title={canUpdate ? "Update task status" : "Only the task owner or a manager can change status"}
      type="button"
    >
      <Circle size={9} />{label}{canUpdate ? <ChevronDown size={13} /> : null}
    </button>
    {open && canUpdate ? createPortal(<div
      aria-label="Update task status"
      className="task-status-badge-popover"
      id={panelId}
      ref={panelRef}
      role="dialog"
      style={{ left: position.left, top: position.top, width: position.width, maxHeight: `calc(100dvh - ${position.top + 16}px)` }}
    >
      <header><strong>Task status</strong><button aria-label="Close status controls" onClick={close} title="Close" type="button"><X size={17} /></button></header>
      {currentStatus === TaskStatus.COMPLETED ? <p>This task is completed. Status changes are unavailable for closed tasks.</p> : <TaskStatusPanel actorIsManager={actorIsManager} canUpdate={canUpdate} initialReadiness={readiness} key={currentStatus} onStatusChanged={(status) => { onStatusChanged(status); close(); }} task={{ ...task, status: currentStatus }} />}
    </div>, document.body) : null}
  </>;
}
