import { previewEnabled } from "../lib/domain";

export function allowPreviewRequest(request: Request, environment: Record<string, string | undefined>, mutation = false) {
  if (!previewEnabled(environment)) return false;
  try {
    const host = request.headers.get("host");
    if (!host) return false;
    const incoming = new URL(request.url);
    const origin = new URL(`${incoming.protocol}//${host}`);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) return false;
    if (mutation && request.headers.get("origin") !== origin.origin) return false;
    return true;
  } catch {
    return false;
  }
}
