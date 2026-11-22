import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getRepairResume } from "@/server/repair-order/resume-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const decision = await getRepairResume(user, id);
  if (!decision) return NextResponse.json({ error: "Open repair order is unavailable." }, { status: 404 });
  return NextResponse.json({ ...decision.summary, estimateDraftId: decision.draftId, vendor: decision.vendor }, { headers: { "Cache-Control": "private, no-store" } });
}
