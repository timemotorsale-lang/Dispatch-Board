import { MasterTechnicianPrototype } from "@/features/diagnostics/master-technician-prototype";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function MasterTechnicianPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [user, params] = await Promise.all([requireCurrentUser(), searchParams]);
  return <MasterTechnicianPrototype initialQuestion={params.q ?? ""} viewerName={user.name} />;
}
