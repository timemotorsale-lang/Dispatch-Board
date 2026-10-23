import { CarFront, FileText, Gauge, MessageSquareText, ShieldCheck } from "lucide-react";
import type { NavigationItem } from "@/components/layout/navigation";

export const websiteSections = ["overview", "inventory", "content", "requests", "readiness"] as const;
export type WebsiteSection = (typeof websiteSections)[number];

export function resolveWebsiteSection(value?: string): WebsiteSection {
  return websiteSections.find((section) => section === value) ?? "overview";
}

export const websiteConsoleNavigationItems: NavigationItem[] = [
  { href: "/website-console", title: "Overview", description: "Website operating home.", icon: Gauge, activeQuery: { section: null }, matchExact: true },
  { href: "/website-console?section=inventory", title: "Inventory", description: "Canonical inventory and merchandising tools.", icon: CarFront, activeQuery: { section: "inventory" } },
  { href: "/website-console?section=content", title: "Content & Media", description: "Website content ownership and publication readiness.", icon: FileText, activeQuery: { section: "content" } },
  { href: "/website-console?section=requests", title: "Customer Requests", description: "Sales and service handoff readiness.", icon: MessageSquareText, activeQuery: { section: "requests" } },
  { href: "/website-console?section=readiness", title: "Launch Readiness", description: "Unconnected systems and release gates.", icon: ShieldCheck, activeQuery: { section: "readiness" } }
];
