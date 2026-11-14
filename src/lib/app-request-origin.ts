export function isTrustedAppMutation(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  const host = request.headers.get("host") || new URL(request.url).host;
  try {
    const source = new URL(origin);
    return ["http:", "https:"].includes(source.protocol) && source.host === host && source.origin === origin;
  } catch {
    return false;
  }
}
