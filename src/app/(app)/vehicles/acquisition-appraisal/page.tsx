import { AcquisitionAppraisalWorkspace } from "@/features/inventory/acquisition-appraisal-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getAcquisitionCaseOptions, listAcquisitionCases } from "@/server/acquisition-appraisal/service";

export default async function AcquisitionAppraisalPage() { const user = await requireCurrentUser(); const [initial, options] = await Promise.all([listAcquisitionCases(user), getAcquisitionCaseOptions(user)]); return <AcquisitionAppraisalWorkspace initial={JSON.parse(JSON.stringify(initial))} options={JSON.parse(JSON.stringify(options))} />; }
