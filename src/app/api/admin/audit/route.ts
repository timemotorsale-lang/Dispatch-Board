import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { exploreEnterpriseAudit } from "@/server/enterprise-command/audit-explorer";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = (key: string) => { const value = url.searchParams.get(key); return value ? new Date(value) : undefined; };
    return NextResponse.json(await exploreEnterpriseAudit(await getCurrentUser(), {
      domain: url.searchParams.get("domain") ?? undefined, subjectType: url.searchParams.get("subjectType") ?? undefined,
      subjectId: url.searchParams.get("subjectId") ?? undefined, actorUserId: url.searchParams.get("actorUserId") ?? undefined,
      eventType: url.searchParams.get("eventType") ?? undefined, correlationId: url.searchParams.get("correlationId") ?? undefined,
      from: date("from"), to: date("to"), limit: Number(url.searchParams.get("limit") ?? 100)
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audit explorer request failed.";
    return NextResponse.json({ error: message }, { status: message.includes("required") ? 401 : message.includes("privileges") ? 403 : 400 });
  }
}
