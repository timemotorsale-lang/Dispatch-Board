"use client";

import { useState } from "react";

export function PrintTechnicianWorkOrder({ verifyPrintAction }: { verifyPrintAction: () => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function print() {
    setBusy(true);
    setError("");
    try {
      if (await verifyPrintAction()) {
        document.documentElement.setAttribute("data-technician-print-approved", "");
        try { window.print(); }
        finally { document.documentElement.removeAttribute("data-technician-print-approved"); }
      } else setError("Approved work changed or is no longer available. Refresh the page and review the current work order before printing.");
    } catch {
      setError("Current approval could not be verified. Retry printing.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button className="button button-primary" disabled={busy} onClick={() => void print()} type="button">
      {busy ? "Checking approval..." : "Print technician work order"}
    </button>
    {error && <p role="alert">{error}</p>}
  </>;
}
