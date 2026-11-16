import { handleSmsStatus } from "@/features/collections/server/messaging-service";
import { handleTwilioWebhook } from "@/features/collections/server/twilio-webhook";

/** Twilio delivery-status callback. Public, but only accepts signed Twilio requests. */
export async function POST(request: Request) {
  return handleTwilioWebhook(request, "/api/collections/sms/status", handleSmsStatus);
}
