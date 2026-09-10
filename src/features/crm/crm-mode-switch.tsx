"use client";

import Link from "next/link";

const fallbackLinks = [
  { href: "/customers", label: "Customer Archive" },
  { href: "/crm", label: "Current CRM Fallback" }
] as const;

export function CrmModeSwitch() {
  return (
    <nav aria-label="Default CRM and fallback tools" className="crm-mode-switch">
      <span>Default CRM</span>
      <Link aria-current="page" href="/crm-next">CRM Next</Link>
      <details>
        <summary>Older tools</summary>
        <div>
          {fallbackLinks.map((link) => (
            <Link href={link.href} key={link.href}>{link.label}</Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
