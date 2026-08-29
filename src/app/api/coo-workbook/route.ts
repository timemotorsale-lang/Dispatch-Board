import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required.");
    const model = await getServiceAdvisorWorkspace(user);
    return NextResponse.json({ workbook: model.workbook });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load COO workbook.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 500 });
  }
}
