import Link from "next/link";

import { APP_NAME } from "./config";

const workspaceLinks = [
  {
    description: "Open the daily command center for active dispatch work, queues, and team execution.",
    href: "/board",
    label: "Open Dispatch Board",
    title: "Dispatch Board",
    tone: "primary"
  },
  {
    description: "Work customers, prospects, leads, follow-ups, appointments, and CRM actions.",
    href: "/crm-next",
    label: "Open CRM Next",
    title: "CRM Next",
    tone: "primary"
  },
  {
    description: "Review customer records and continue customer work from the shared customer source.",
    href: "/customers",
    label: "Open Customers",
    title: "Customers",
    tone: "secondary"
  },
  {
    description: "See assigned work and complete the next action for your role.",
    href: "/my-tasks",
    label: "Open My Tasks",
    title: "My Tasks",
    tone: "secondary"
  },
  {
    description: "Create, review, and manage formal tasks that need ownership and tracking.",
    href: "/tasks",
    label: "Open Tasks",
    title: "Tasks",
    tone: "secondary"
  },
  {
    description: "Sign in or switch staff session before entering protected workspaces.",
    href: "/login",
    label: "Open Login",
    title: "Login",
    tone: "secondary"
  }
];

export default function HomePage() {
  return (
    <main
      aria-labelledby="home-launcher-title"
      style={{
        background: "linear-gradient(135deg, #edf3fb 0%, #f8fbff 48%, #eef4ff 100%)",
        color: "#071735",
        minHeight: "100vh",
        padding: 24
      }}
    >
      <section
        style={{
          display: "grid",
          gap: 18,
          margin: "0 auto",
          maxWidth: 1180
        }}
      >
        <header
          style={{
            alignItems: "end",
            background: "linear-gradient(125deg, #07182c, #0a2948)",
            border: "1px solid #183a5d",
            borderRadius: 18,
            boxShadow: "0 22px 50px rgba(6,20,38,.16)",
            color: "#fff",
            display: "flex",
            gap: 24,
            justifyContent: "space-between",
            padding: "26px 28px"
          }}
        >
          <div>
            <p style={{ color: "#7fb3ff", fontSize: 12, fontWeight: 900, letterSpacing: ".16em", margin: "0 0 8px", textTransform: "uppercase" }}>
              Workspace launcher
            </p>
            <h1 id="home-launcher-title" style={{ fontSize: "clamp(30px, 4vw, 48px)", letterSpacing: "-.04em", lineHeight: 1, margin: 0 }}>
              {APP_NAME}
            </h1>
            <p style={{ color: "#c2d2e5", fontSize: 15, lineHeight: 1.55, margin: "12px 0 0", maxWidth: 720 }}>
              Choose the workspace you need and continue working from a safe, protected route.
            </p>
          </div>
          <span
            style={{
              alignItems: "center",
              background: "rgba(13,91,47,.45)",
              border: "1px solid rgba(85,208,122,.34)",
              borderRadius: 999,
              color: "#c8f8d6",
              display: "inline-flex",
              fontSize: 12,
              fontWeight: 900,
              gap: 8,
              minHeight: 38,
              padding: "0 14px",
              textTransform: "uppercase",
              whiteSpace: "nowrap"
            }}
          >
            <i style={{ background: "#55dc7e", borderRadius: "50%", display: "inline-block", height: 8, width: 8 }} />
            System ready
          </span>
        </header>

        <nav
          aria-label="Primary workspace links"
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
          }}
        >
          {workspaceLinks.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              style={{
                background: "#fff",
                border: link.tone === "primary" ? "1px solid #b8d1ff" : "1px solid #dbe6f5",
                borderRadius: 16,
                boxShadow: "0 12px 30px rgba(15, 23, 42, .08)",
                color: "#10233f",
                display: "grid",
                gap: 10,
                minHeight: 150,
                padding: 20,
                textDecoration: "none"
              }}
            >
              <span style={{ color: "#2563eb", fontSize: 12, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase" }}>
                {link.title}
              </span>
              <strong style={{ fontSize: 23, letterSpacing: "-.03em" }}>{link.label}</strong>
              <small style={{ color: "#61758d", fontSize: 14, lineHeight: 1.45 }}>{link.description}</small>
              <b
                style={{
                  alignItems: "center",
                  background: link.tone === "primary" ? "#2563eb" : "#eef4ff",
                  border: link.tone === "primary" ? "1px solid #2563eb" : "1px solid #cfe0ff",
                  borderRadius: 10,
                  color: link.tone === "primary" ? "#fff" : "#143163",
                  display: "inline-flex",
                  fontSize: 13,
                  fontWeight: 900,
                  justifyContent: "center",
                  marginTop: "auto",
                  minHeight: 38,
                  padding: "0 13px",
                  width: "max-content"
                }}
              >
                Continue
              </b>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
