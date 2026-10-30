"use client";
export default function ReportsError({ reset }: { reset: () => void }) {
  return <main style={{ padding: 24 }}><h1>Reports</h1><p role="alert">The report workspace could not open. Your saved reports have not been changed.</p><button onClick={reset}>Try opening reports again</button></main>;
}
