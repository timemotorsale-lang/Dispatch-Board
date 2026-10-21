import Link from "next/link";
import { requireCurrentUser } from "@/server/auth/current-user";
import { staffCompanyAccess } from "@/server/money-resources/staff-access";
import { StaffCompanyAccess } from "@/features/settings/staff-company-access";

export default async function StaffCompanyAccessPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const actor = await requireCurrentUser();
  const query = await searchParams;
  let model: Awaited<ReturnType<typeof staffCompanyAccess>> | null = null;
  let errorMessage = "";
  try {
    model = await staffCompanyAccess(actor, typeof query.userId === "string" ? query.userId : "");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Staff access is unavailable.";
  }
  return <main className="page-stack"><Link href="/settings/team">← Team management</Link><h1>Staff company access</h1><p>Review one staff member and repair a missing company assignment. Existing assignments are never silently changed.</p>{model ? <StaffCompanyAccess key={model.userId} model={model} /> : <p role="alert">{errorMessage}</p>}</main>;
}
