"use client";

export default function RepairWorkbenchError({ reset }: { reset: () => void }) {
  return <main><h1>Repair tool could not open</h1><p role="alert">Your saved records are retained. Retry this RO; if the issue continues, ask an administrator to check setup and access.</p><button type="button" onClick={reset}>Retry this repair workbench</button><a href="/prototype/repair-workflow">Return to Find vehicle</a></main>;
}
