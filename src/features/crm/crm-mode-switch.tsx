"use client";

import Link from "next/link";

type CrmMode = "legacy" | "unified" | "next";

const modes = [
  { id: "legacy", href: "/customers", label: "Legacy CRM" },
  { id: "unified", href: "/crm", label: "Unified CRM" },
  { id: "next", href: "/crm-next", label: "CRM Next" }
] as const;

export function CrmModeSwitch({ active }: { active: CrmMode }) {
  return (
    <nav aria-label="CRM mode switch" className="crm-mode-switch">
      <span>CRM Mode</span>
      {modes.map((mode) => (
        <Link aria-current={active === mode.id ? "page" : undefined} href={mode.href} key={mode.id}>
          {mode.label}
        </Link>
      ))}
    </nav>
  );
}
