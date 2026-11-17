export function phoneAppOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "127.0.0.1" || url.hostname === "[::1]") return null;
    return url.origin;
  } catch { return null; }
}

export function phoneDocumentHandoff(origin: string, jacketId: string, requirementId = "") {
  const safeOrigin = phoneAppOrigin(origin);
  if (!safeOrigin || !jacketId) return null;
  const url = new URL("/sales-documents", safeOrigin);
  url.searchParams.set("jacketId", jacketId);
  url.searchParams.set("scan", "1");
  if (requirementId) url.searchParams.set("requirementId", requirementId);
  return url.toString();
}
