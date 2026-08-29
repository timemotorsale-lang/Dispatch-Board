import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="app-route-recovery" aria-labelledby="route-recovery-title">
      <section>
        <p>Workspace not found</p>
        <h1 id="route-recovery-title">This shortcut is no longer available.</h1>
        <span>
          The page you opened may be an old local link or a workspace that is still behind rollout controls.
          Use one of the safe workspaces below to keep working.
        </span>
        <nav aria-label="Safe workspace recovery links">
          <Link href="/customers">Open Customers</Link>
          <Link href="/customers/customer-360">Open Customer 360</Link>
          <Link href="/crm">Open CRM</Link>
          <Link href="/board">Open Dispatch Board</Link>
        </nav>
      </section>
    </main>
  );
}
