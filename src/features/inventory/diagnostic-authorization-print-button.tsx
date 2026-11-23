"use client";

export function DiagnosticAuthorizationPrintButton() {
  return <button className="pill pill-primary" type="button" onClick={() => window.print()}>Print document</button>;
}
