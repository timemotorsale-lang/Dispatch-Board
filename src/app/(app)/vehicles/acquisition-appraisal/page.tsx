import { AcquisitionAppraisalWorkspace } from "@/features/inventory/acquisition-appraisal-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getAcquisitionCaseOptions, listAcquisitionCases } from "@/server/acquisition-appraisal/service";

export default async function AcquisitionAppraisalPage({ searchParams }: { searchParams?: Promise<{ caseId?: string; returnTo?: string; vehicleId?: string }> }) { const user = await requireCurrentUser(); const params = searchParams ? await searchParams : {}; const [initial, options] = await Promise.all([listAcquisitionCases(user), getAcquisitionCaseOptions(user)]); return <AcquisitionAppraisalWorkspace initial={JSON.parse(JSON.stringify(initial))} initialCaseId={params.caseId} initialVehicleId={params.vehicleId} options={JSON.parse(JSON.stringify(options))} returnTo={params.returnTo} />; }
