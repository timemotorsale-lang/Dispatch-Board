import Link from "next/link";

import { CRM_NEXT_CUSTOMERS_HREF, CRM_NEXT_SEARCH_HREF, LEGACY_CRM_FALLBACK_HREF, LEGACY_CUSTOMER_ARCHIVE_HREF } from "@/features/crm/crm-route-authority";

export default function NotFoundPage() {
  return (
    <main
      aria-labelledby="route-recovery-title"
      className="app-route-recovery"
      style={{
        alignItems: "center",
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
        <p style={{ color: "#2563eb", fontSize: 12, fontWeight: 900, letterSpacing: ".12em", margin: 0, textTransform: "uppercase" }}>Workspace not found</p>
        <h1 id="route-recovery-title" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, margin: 0 }}>This shortcut is no longer available.</h1>
        <span style={{ color: "#5e6b82", fontSize: 16, lineHeight: 1.55, margin: 0, maxWidth: "58ch" }}>
          The page you opened may be an old local link or a workspace that is still behind rollout controls.
          Use one of the safe workspaces below to keep working.
        </span>
        <nav aria-label="Safe workspace recovery links" style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 8 }}>
          <Link href="/crm-next" style={{ alignItems: "center", background: "#2563eb", borderRadius: 10, color: "#fff", display: "inline-flex", fontWeight: 800, justifyContent: "center", minHeight: 40, padding: "0 16px", textDecoration: "none" }}>Open CRM Next</Link>
          <Link href={CRM_NEXT_CUSTOMERS_HREF} style={{ alignItems: "center", background: "#2563eb", borderRadius: 10, color: "#fff", display: "inline-flex", fontWeight: 800, justifyContent: "center", minHeight: 40, padding: "0 16px", textDecoration: "none" }}>Open CRM Next Customers</Link>
          <Link href={CRM_NEXT_SEARCH_HREF} style={{ alignItems: "center", background: "#eef4ff", border: "1px solid #cfe0ff", borderRadius: 10, color: "#143163", display: "inline-flex", fontWeight: 800, justifyContent: "center", minHeight: 40, padding: "0 16px", textDecoration: "none" }}>Find Customer 360</Link>
          <Link href={LEGACY_CUSTOMER_ARCHIVE_HREF} style={{ alignItems: "center", background: "#eef4ff", border: "1px solid #cfe0ff", borderRadius: 10, color: "#143163", display: "inline-flex", fontWeight: 800, justifyContent: "center", minHeight: 40, padding: "0 16px", textDecoration: "none" }}>Legacy Customer Archive</Link>
          <Link href={LEGACY_CRM_FALLBACK_HREF} style={{ alignItems: "center", background: "#eef4ff", border: "1px solid #cfe0ff", borderRadius: 10, color: "#143163", display: "inline-flex", fontWeight: 800, justifyContent: "center", minHeight: 40, padding: "0 16px", textDecoration: "none" }}>Legacy CRM</Link>
          <Link href="/board" style={{ alignItems: "center", background: "#eef4ff", border: "1px solid #cfe0ff", borderRadius: 10, color: "#143163", display: "inline-flex", fontWeight: 800, justifyContent: "center", minHeight: 40, padding: "0 16px", textDecoration: "none" }}>Open Dispatch Board</Link>
        </nav>
      </section>
    </main>
  );
}
