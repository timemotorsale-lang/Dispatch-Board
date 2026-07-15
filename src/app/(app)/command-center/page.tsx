import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { getNavigationGroups } from "@/components/layout/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function CommandCenterHomePage() {
  const user = await requireCurrentUser();
  const groups = getNavigationGroups(user);

  return (
    <div className="ccc-home-page">
      <header className="ccc-home-hero">
        <div>
          <span className="eyebrow">Time Motor Sales</span>
          <h1>Command Control Center</h1>
          <p>Select an operational console. Each console opens as a focused command center with its own navigation and a persistent path back here.</p>
        </div>
        <span className="ccc-home-status"><i aria-hidden="true" />Enterprise shell active</span>
      </header>

      {groups.map((group) => (
        <section className="ccc-home-group" key={group.label}>
          <div className="ccc-home-group-heading">
            <span>{group.label}</span>
            <small>{group.label === "Operations" ? "Operational consoles" : group.label === "Planned" ? "Future command centers" : "Enterprise controls"}</small>
          </div>
          <div className="ccc-home-console-grid">
            {group.items.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <span className="ccc-home-console-icon"><Icon size={22} strokeWidth={1.8} /></span>
                  <span className="ccc-home-console-copy">
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                  {item.disabled ? (
                    <span className="ccc-home-console-state ccc-home-console-planned"><LockKeyhole size={12} />Planned</span>
                  ) : (
                    <span className="ccc-home-console-state">{item.badge ?? "Open"}<ArrowRight size={13} /></span>
                  )}
                </>
              );

              return item.disabled ? (
                <article className="ccc-home-console-card ccc-home-console-card-disabled" key={item.href}>
                  {content}
                </article>
              ) : (
                <Link className="ccc-home-console-card" href={item.href} key={item.href}>
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
