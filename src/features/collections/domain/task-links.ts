/**
 * Links from a dispatch board task back to the Collections screen it came from.
 * Collections tasks keep { source: "COLLECTIONS", accountId } (or a reason with no account,
 * like the daily import reminder) in their templateSnapshot.
 */
export function collectionsTaskHref(sourceType: string | null | undefined, snapshot: unknown): string | null {
  if (sourceType !== "COLLECTIONS" || !snapshot || typeof snapshot !== "object") return null;
  const value = snapshot as Record<string, unknown>;
  if (typeof value.accountId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value.accountId)) {
    return `/collections/accounts/${encodeURIComponent(value.accountId)}`;
  }
  if (value.reason === "IMPORT_REMINDER") return "/collections/import";
  return "/collections";
}

/** Button text for the link above. */
export function collectionsTaskLinkLabel(href: string) {
  return href.startsWith("/collections/accounts/") ? "Open collections account" : href === "/collections/import" ? "Open the import screen" : "Open Collections";
}
