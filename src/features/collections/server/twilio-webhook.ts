/**
 * Shared handling for the two public Twilio webhooks. Every request must carry a valid
 * Twilio signature (made with TWILIO_AUTH_TOKEN over the public URL); anything else is
 * rejected. Requests are rate-limited, and nothing is answered while the module is OFF.
 */
import { resolveCollectionsMode } from "../config/flags";
import { publicWebhookUrl, verifyTwilioSignature, webhookRateLimited } from "./providers";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

export async function handleTwilioWebhook(request: Request, path: string, handler: (params: Record<string, string>) => Promise<unknown>) {
  if (resolveCollectionsMode() === "OFF") return new Response("Not found", { status: 404 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (webhookRateLimited(`${path}:${ip}`)) return new Response("Too many requests", { status: 429 });
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) return new Response("Unsupported", { status: 415 });
  const raw = await request.text();
  if (raw.length > 64_000) return new Response("Too large", { status: 413 });
  const params = Object.fromEntries(new URLSearchParams(raw));
  const valid = verifyTwilioSignature({ authToken: process.env.TWILIO_AUTH_TOKEN?.trim(), url: publicWebhookUrl(path), params, signature: request.headers.get("x-twilio-signature") });
  if (!valid) return new Response("Forbidden", { status: 403 });
  try {
    await handler(params);
  } catch (error) {
    console.error(`[collections] webhook ${path} failed`, error instanceof Error ? error.message : error);
    return new Response("Error", { status: 500 });
  }
  return new Response(EMPTY_TWIML, { status: 200, headers: { "Content-Type": "text/xml" } });
}
