import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  issuePasswordResetLink,
  listPasswordRecoveryRequests,
  requestPasswordRecovery
} from "@/server/auth/password-recovery";

function statusFor(message: string) {
  if (message.includes("authorized manager")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("cannot") || message.includes("required") || message.includes("No staff account") || message.includes("Inactive")) return 400;
  return 500;
}

export async function GET() {
  const actor = await getCurrentUser();

  try {
    return NextResponse.json({ requests: await listPasswordRecoveryRequests(actor) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load password recovery requests.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await requestPasswordRecovery(payload), { status: 201 });
  } catch {
    return NextResponse.json(await requestPasswordRecovery(null), { status: 201 });
  }
}

export async function PATCH(request: Request) {
  const actor = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const requestId = payload && typeof payload === "object" && "requestId" in payload
    ? (payload as { requestId?: unknown }).requestId
    : null;

  try {
    return NextResponse.json(await issuePasswordResetLink(actor, requestId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to issue password reset link.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
