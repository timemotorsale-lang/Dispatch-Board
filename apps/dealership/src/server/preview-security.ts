import { previewEnabled } from "../lib/domain";
import { createHash, timingSafeEqual } from "node:crypto";

export function allowPreviewRequest(request: Request, environment: Record<string, string | undefined>, mutation = false) {
  if (!previewEnabled(environment)) return false;
  if (environment.DEALERSHIP_HOSTED_REVIEW === "1") {
    const expected = environment.DEALERSHIP_REVIEW_KEY;
    const supplied = request.headers.get("x-tms-review-key");
    if (!expected || expected.length < 32 || !supplied || !environment.DEALERSHIP_REVIEW_ORIGIN) return false;
    const digest = (value: string) => createHash("sha256").update(value).digest();
    if (!timingSafeEqual(digest(supplied), digest(expected))) return false;
    return !mutation || request.headers.get("origin") === environment.DEALERSHIP_REVIEW_ORIGIN;
  }
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
