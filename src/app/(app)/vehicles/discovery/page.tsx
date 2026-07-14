import { VehicleDiscoveryWorkspace } from "@/features/inventory/vehicle-discovery-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getWorkKnowledgeWorkspace } from "@/server/vehicle-discovery/service";
export default async function VehicleDiscoveryPage() { const user = await requireCurrentUser(), knowledge = await getWorkKnowledgeWorkspace(user); return <VehicleDiscoveryWorkspace initialKnowledge={JSON.parse(JSON.stringify(knowledge))} />; }
