import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/server/auth/current-user";
import { previewCrmNextActionToTaskBridge } from "@/server/crm-next/action-bridge";

export async function POST(request: Request) {
  const actor = await requireCurrentUser();
  const payload = await request.json().catch(() => ({}));
  const attentionItemId = typeof payload.attentionItemId === "string" ? payload.attentionItemId : "";
  const preview = previewCrmNextActionToTaskBridge(actor, { attentionItemId });

  return NextResponse.json(preview, {
    status: preview.state === "DENIED" ? 403 : 200,
    headers: { "cache-control": "no-store" }
  });
}

