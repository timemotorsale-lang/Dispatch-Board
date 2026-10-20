"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function CalendarDetailDialog({ children, onClose, onSubmit }: {
  children: ReactNode;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog aria-label="Appointment details" className="calendar-detail-dialog" onCancel={(event) => { event.preventDefault(); onClose(); }} ref={dialogRef}>
      <form className="calendar-detail-dialog-form" onSubmit={(event) => { event.stopPropagation(); onSubmit(event); }}>
        {children}
      </form>
    </dialog>,
    document.body
  );
}
