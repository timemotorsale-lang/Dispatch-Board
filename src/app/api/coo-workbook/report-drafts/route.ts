import { NextResponse } from "next/server";

import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";
import { getCurrentUser } from "@/server/auth/current-user";
import { createCooWorkbookReportDraft, currentWorkdayBoardDate } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("must be") || message.includes("not supported")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? currentWorkdayBoardDate();
  const cadence = (url.searchParams.get("cadence") ?? "DAILY").toUpperCase();

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required.");
    const model = await getServiceAdvisorWorkspace(user);
    const approvalCount = model.actionQueue.filter((item) => item.actionKind === "AUTHORIZATION").length;
    const handoffCount = model.actionQueue.filter((item) => item.actionKind === "HANDOFF").length;
    const reportExceptions = model.counts.needsAttention + model.counts.waitingOnOthers;
    return NextResponse.json(await createCooWorkbookReportDraft(user, boardDate, cadence, {
      approvalCount,
      handoffCount,
      reportExceptions
    }), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate Daily Report Draft.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
