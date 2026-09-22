import { DocumentLibraryLanding } from "@/features/document-library/document-library-landing";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDocumentLibrary } from "@/server/document-library/service";

export default async function DocumentsPage() {
  let library = null;
  let errorMessage: string | null = null;

  try {
    library = await getDocumentLibrary(await getCurrentUser());
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Document Library is temporarily unavailable.";
  }

  return <DocumentLibraryLanding error={errorMessage} initialLibrary={library} />;
}
