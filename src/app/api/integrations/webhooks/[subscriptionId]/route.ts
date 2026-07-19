import { NextResponse } from "next/server";
import { ingestSignedWebhook } from "@/server/integrations/security-service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Webhook ingress failed."; const status = /replay/i.test(message) ? 409 : /secret.*unavailable|provider is unavailable/i.test(message) ? 503 : /signature|origin|timestamp|subscribed|credential|subscription/i.test(message) ? 401 : 400; return NextResponse.json({ error: message }, { status }); }
export async function POST(request: Request, context: { params: Promise<{ subscriptionId: string }> }) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0); if (contentLength > 1_048_576) return NextResponse.json({ error: "Webhook payload exceeds the one megabyte limit." }, { status: 413 });
    const body = await request.text(), { subscriptionId } = await context.params;
    const required = (name: string) => { const value = request.headers.get(name)?.trim(); if (!value) throw new Error(`Webhook ${name} header is required.`); return value; };
    const result = await ingestSignedWebhook(subscriptionId, { apiVersion: required("x-api-version"), body, deliveryId: required("x-delivery-id"), eventTimestamp: required("x-event-timestamp"), eventType: required("x-event-type"), origin: request.headers.get("x-webhook-origin")?.trim() || required("origin"), signature: required("x-signature") });
    return NextResponse.json(result, { status: 202 });
  } catch (error) { return failure(error); }
}
