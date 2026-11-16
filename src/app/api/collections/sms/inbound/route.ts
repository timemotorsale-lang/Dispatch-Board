import { handleInboundSms } from "@/features/collections/server/messaging-service";
import { handleTwilioWebhook } from "@/features/collections/server/twilio-webhook";

/** Twilio "A message comes in" webhook. Public, but only accepts signed Twilio requests. */
export async function POST(request: Request) {
  return handleTwilioWebhook(request, "/api/collections/sms/inbound", handleInboundSms);
}
