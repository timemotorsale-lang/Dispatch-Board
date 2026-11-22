"use client";

import { flushSync } from "react-dom";
import { useRef, useState } from "react";

export function PrintTechnicianWorkOrder({ verifyPrintAction, timeZone, controlsClassName }: {
  verifyPrintAction: () => Promise<boolean>;
  timeZone: string;
  controlsClassName: string;
}) {
  const checking = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [printedAt, setPrintedAt] = useState<Date>();

  async function print() {
    if (checking.current) return;
    checking.current = true;
    setBusy(true);
    setError("");
    try {
      if (!await verifyPrintAction()) {
        setError("The work order changed or is no longer available. Refresh and review the current work order before printing.");
        return;
      }
      flushSync(() => setPrintedAt(new Date()));
      document.documentElement.setAttribute("data-technician-print-approved", "");
      try {
        window.print();
      } finally {
        document.documentElement.removeAttribute("data-technician-print-approved");
      }
    } catch {
      setError("The current work order could not be verified for printing. Try again.");
    } finally {
      checking.current = false;
      setBusy(false);
    }
  }

  return <>
    <div className={controlsClassName}>
      <button className="button button-primary" disabled={busy} onClick={() => void print()} type="button">
        {busy ? "Checking work order…" : "Print technician work order"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
    {printedAt && <p>Print date <time dateTime={printedAt.toISOString()}>
      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone }).format(printedAt)}
    </time></p>}
  </>;
}
