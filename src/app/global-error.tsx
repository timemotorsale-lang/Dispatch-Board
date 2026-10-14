"use client";

import Link from "next/link";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  void error;

  return (
    <html lang="en">
      <body>
        <main
          aria-labelledby="global-error-title"
          style={{
            background: "radial-gradient(circle at top left, #eef6ff 0, #f8fbff 38%, #f4f7fb 100%)",
            color: "#071735",
            display: "grid",
            minHeight: "100vh",
            padding: 24,
            placeItems: "center"
          }}
        >
          <section
            style={{
              background: "#fff",
              border: "1px solid #dbe6f5",
              borderRadius: 18,
              boxShadow: "0 18px 42px rgba(15, 23, 42, .12)",
              display: "grid",
              gap: 16,
              padding: 28,
              width: "min(760px, 100%)"
            }}
          >
            <p style={{ color: "#c2410c", fontSize: 12, fontWeight: 900, letterSpacing: ".12em", margin: 0, textTransform: "uppercase" }}>
              Workspace temporarily unavailable
            </p>
            <h1 id="global-error-title" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, margin: 0 }}>
              This workspace needs a quick reload.
            </h1>
            <p style={{ color: "#5e6b82", fontSize: 16, lineHeight: 1.55, margin: 0, maxWidth: "58ch" }}>
              Your saved work has not been changed. Retry the workspace, or open one of the daily work areas below.
            </p>
            <nav aria-label="Global error recovery links" style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 8 }}>
              <button
                onClick={reset}
                style={{
                  alignItems: "center",
                  background: "#2563eb",
                  border: "1px solid #2563eb",
                  borderRadius: 10,
                  color: "#fff",
                  cursor: "pointer",
                  display: "inline-flex",
                  font: "inherit",
                  fontWeight: 800,
                  justifyContent: "center",
                  minHeight: 40,
                  padding: "0 16px"
                }}
                type="button"
              >
                Retry workspace
              </button>
              <Link href="/diagnostics/labor-guide" style={{ alignItems: "center", background: "#eef4ff", border: "1px solid #cfe0ff", borderRadius: 10, color: "#143163", display: "inline-flex", fontWeight: 800, justifyContent: "center", minHeight: 40, padding: "0 16px", textDecoration: "none" }}>
                Open Labor Guide
              </Link>
              <Link href="/board" style={{ alignItems: "center", background: "#eef4ff", border: "1px solid #cfe0ff", borderRadius: 10, color: "#143163", display: "inline-flex", fontWeight: 800, justifyContent: "center", minHeight: 40, padding: "0 16px", textDecoration: "none" }}>
                Open Dispatch Board
              </Link>
              <Link href="/command-center" style={{ alignItems: "center", background: "#eef4ff", border: "1px solid #cfe0ff", borderRadius: 10, color: "#143163", display: "inline-flex", fontWeight: 800, justifyContent: "center", minHeight: 40, padding: "0 16px", textDecoration: "none" }}>
                Open Command Center
              </Link>
            </nav>
          </section>
        </main>
      </body>
    </html>
  );
}
