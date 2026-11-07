import {requireCurrentUser} from "@/server/auth/current-user";
import {DocumentReadingWorkspace} from "@/features/document-library/document-reading-workspace";
import {isDocumentReadingPurpose} from "@/lib/document-reading";
export default async function ReadDocumentsPage({searchParams}:{searchParams?:Promise<{purpose?:string}>}){await requireCurrentUser();const params=await searchParams;return <DocumentReadingWorkspace initialPurpose={isDocumentReadingPurpose(params?.purpose)?params.purpose:"SALES"}/>;}
