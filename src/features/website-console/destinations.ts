export type WebsiteDestinations = {
  publicUrl: string | null;
  previewUrl: string | null;
};

function originOnly(value: string | undefined, preview: boolean): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    const hostname = url.hostname.toLowerCase();
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    if (preview) return url.protocol === "http:" && loopback ? url.origin : null;
    if (url.protocol !== "https:" || loopback || !hostname.includes(".")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getWebsiteDestinations(env: Record<string, string | undefined>): WebsiteDestinations {
  const publicUrl = originOnly(env.DEALERSHIP_PUBLIC_URL, false);
  const previewDisabled = env.DEALERSHIP_PREVIEW_ENABLED === "false" || Boolean(publicUrl) || env.NODE_ENV === "production";
  const previewOrigin = env.DEALERSHIP_PREVIEW_URL?.trim() || (env.NODE_ENV === "development" ? "http://127.0.0.1:3100" : undefined);
  return {
    publicUrl,
    previewUrl: publicUrl || env.DEALERSHIP_PREVIEW_ENABLED === "false" ? null : env.DEALERSHIP_HOSTED_REVIEW_ENABLED === "true" ? "/website-review" : previewDisabled ? null : originOnly(previewOrigin, true)
  };
}
