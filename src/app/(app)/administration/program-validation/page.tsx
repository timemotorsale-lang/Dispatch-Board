import { ProgramIntegrationValidationWorkspace } from "@/features/inventory/program-integration-validation-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getProgramIntegrationValidation } from "@/server/program-integration-validation/service";

export default async function ProgramValidationPage({ searchParams }: { searchParams?: Promise<{ view?: string | string[] }> }) {
  const user = await requireCurrentUser(), params = searchParams ? await searchParams : undefined, view = Array.isArray(params?.view) ? params.view[0] : params?.view;
  return <ProgramIntegrationValidationWorkspace model={getProgramIntegrationValidation(user)} view={view} />;
}
