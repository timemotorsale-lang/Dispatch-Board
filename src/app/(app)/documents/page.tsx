import { DocumentLibraryLanding } from "@/features/document-library/document-library-landing";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDocumentLibrary } from "@/server/document-library/service";

export default async function DocumentsPage({ searchParams }: { searchParams?: Promise<{ ownerId?: string }> }) {
  const ownerId = (searchParams ? await searchParams : {}).ownerId?.slice(0, 120);
  let library = null;
  let errorMessage: string | null = null;

  try {
    library = await getDocumentLibrary(await getCurrentUser(), { smartIntakeOwnerId: ownerId });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Document Library is temporarily unavailable.";
  }

  return <DocumentLibraryLanding error={errorMessage} initialLibrary={library} initialOwnerId={ownerId} />;
}
