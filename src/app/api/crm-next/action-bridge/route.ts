import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/server/auth/current-user";
import { createCrmNextDispatchTaskFromAttention, previewCrmNextActionToTaskBridge } from "@/server/crm-next/action-bridge";

export async function POST(request: Request) {
  const actor = await requireCurrentUser();
  const payload = await request.json().catch(() => ({}));
  const attentionItemId = typeof payload.attentionItemId === "string" ? payload.attentionItemId : "";
  const operation = typeof payload.operation === "string" ? payload.operation : "PREVIEW";

  if (operation === "CREATE_DISPATCH_TASK") {
    try {
      const result = await createCrmNextDispatchTaskFromAttention(actor, {
        attentionItemId,
        idempotencyKey: typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : undefined
      });
      return NextResponse.json(result, {
        status: 201,
        headers: { "cache-control": "no-store" }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Customer Console could not create the Dispatch task.";
      return NextResponse.json({ error: message }, {
        status: message.includes("DOGFOOD") ? 409 : message === "Authentication required." ? 401 : 400,
        headers: { "cache-control": "no-store" }
      });
    }
  }

  const preview = previewCrmNextActionToTaskBridge(actor, { attentionItemId });

  return NextResponse.json(preview, {
    status: preview.state === "DENIED" ? 403 : 200,
    headers: { "cache-control": "no-store" }
  });
}

