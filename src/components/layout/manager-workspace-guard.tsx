"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { getManagerWorkspaceModeLabel, readManagerWorkspaceContext } from "@/lib/manager-workspace-context";

export function ManagerWorkspaceGuard() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = readManagerWorkspaceContext(searchParams);

  if (!context || pathname === "/manager-workspace") return null;

  const focusedTool = pathname.startsWith("/appointments") ? "Appointment Console" : "Focused tool";
  return (
    <nav className="app-return-banner app-manager-workspace-guard" aria-label="Manager workspace protection">
      <Link href={context.returnHref}><ArrowLeft />{context.returnLabel}</Link>
      <span><ShieldCheck />{focusedTool} is contained within {getManagerWorkspaceModeLabel(context.mode)} mode.</span>
    </nav>
  );
}
