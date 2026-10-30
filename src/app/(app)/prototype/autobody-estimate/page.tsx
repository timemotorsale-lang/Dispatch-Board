import { requireCurrentUser } from "@/server/auth/current-user";
import { AutobodyEstimatingWorkspace } from "@/features/autobody-estimating/workspace";

export default async function AutobodyEstimateReviewPage({ searchParams }: { searchParams: Promise<{ repairOrderId?: string; draftId?: string; illustration?: string }> }) { const user = await requireCurrentUser(), params = await searchParams; return <AutobodyEstimatingWorkspace initialRepairOrderId={params.repairOrderId} initialDraftId={params.draftId} userId={user.id} initialIllustration={params.illustration} />; }
