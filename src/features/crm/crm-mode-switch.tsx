"use client";

import Link from "next/link";

import { CRM_NEXT_HOME_HREF, LEGACY_CRM_FALLBACK_HREF, LEGACY_CUSTOMER_ARCHIVE_HREF } from "@/features/crm/crm-route-authority";

const fallbackLinks = [
  { href: LEGACY_CUSTOMER_ARCHIVE_HREF, label: "Legacy customer archive" },
  { href: LEGACY_CRM_FALLBACK_HREF, label: "Legacy CRM fallback" }
] as const;

export function CrmModeSwitch() {
  return (
    <nav aria-label="Default CRM and fallback tools" className="crm-mode-switch">
      <span>Default CRM</span>
      <Link aria-current="page" href={CRM_NEXT_HOME_HREF}>CRM Next</Link>
      <details>
        <summary>Legacy fallbacks</summary>
        <div>
          {fallbackLinks.map((link) => (
            <Link href={link.href} key={link.href}>{link.label}</Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
