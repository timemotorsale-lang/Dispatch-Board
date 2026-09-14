import type { CSSProperties } from "react";
import styles from "./category-badge.module.css";

export const appointmentCategoryColors: Record<string, { label: string; color: string; background: string }> = {
  CHECKLIST: { label: "Checklist", color: "#334155", background: "#f1f5f9" },
  CUSTOMER: { label: "Customer", color: "#1d4ed8", background: "#eff6ff" },
  VENDOR: { label: "Vendor", color: "#7e22ce", background: "#faf5ff" },
  FACILITY: { label: "Facility", color: "#92400e", background: "#fffbeb" },
  STAFF: { label: "Staff", color: "#0e7490", background: "#ecfeff" },
  SALES_OPPORTUNITY: { label: "Sales / Opportunity", color: "#15803d", background: "#f0fdf4" },
  FINANCE: { label: "Finance", color: "#4338ca", background: "#eef2ff" },
  BANKING: { label: "Banking / Lender", color: "#0f4c81", background: "#eff6ff" },
  INSURANCE: { label: "Insurance", color: "#047857", background: "#ecfdf5" },
  LICENSING: { label: "Licensing / Permit", color: "#7c2d12", background: "#fff7ed" },
  INVENTORY_PARTS: { label: "Inventory / Parts", color: "#c2410c", background: "#fff7ed" },
  SAFETY: { label: "Safety", color: "#b91c1c", background: "#fef2f2" },
  TRAINING: { label: "Training", color: "#be185d", background: "#fdf2f8" },
  SERVICE: { label: "Service / Repair", color: "#0f766e", background: "#f0fdfa" },
  WARRANTY: { label: "Warranty", color: "#155e75", background: "#ecfeff" },
  DMV: { label: "Title / DMV", color: "#6b21a8", background: "#faf5ff" },
  DELIVERY: { label: "Delivery", color: "#0369a1", background: "#f0f9ff" },
  RENTAL: { label: "Rental", color: "#1e40af", background: "#eff6ff" },
  LEASING: { label: "Leasing", color: "#4c1d95", background: "#f5f3ff" },
  MARKETING: { label: "Marketing", color: "#a21caf", background: "#fdf4ff" },
  BUSINESS: { label: "Business", color: "#334155", background: "#f8fafc" },
  ADMINISTRATION: { label: "Administration", color: "#374151", background: "#f3f4f6" },
  UTILITIES: { label: "Utility / Phone", color: "#075985", background: "#f0f9ff" },
  COMPLIANCE: { label: "Legal / Compliance", color: "#991b1b", background: "#fef2f2" },
  OTHER: { label: "Other / General", color: "#475569", background: "#f1f5f9" }
};
const aliases: Record<string, string> = {
  SALES: "SALES_OPPORTUNITY",
  COLLECTIONS: "FINANCE",
  INVENTORY: "INVENTORY_PARTS",
  GENERAL: "OTHER",
  VENDOR: "VENDOR",
  FACILITIES: "FACILITY",
  ADMIN: "ADMINISTRATION",
  LEGAL: "COMPLIANCE",
  PERMIT: "LICENSING",
  LICENSE: "LICENSING"
};
export function categoryAppearance(category?: string | null) {
  const key = category?.toUpperCase() ?? "OTHER";
  return appointmentCategoryColors[aliases[key] ?? key] ?? appointmentCategoryColors.OTHER;
}
export function categoryRowStyle(category?: string | null): CSSProperties {
  const appearance = categoryAppearance(category);
  return { borderInlineStart: `4px solid ${appearance.color}` };
}
export function CategoryBadge({ category }: { category?: string | null }) {
  const appearance = categoryAppearance(category);
  return <span className={styles.badge} style={{ color: appearance.color, backgroundColor: appearance.background, borderColor: appearance.color }}>{appearance.label}</span>;
}
