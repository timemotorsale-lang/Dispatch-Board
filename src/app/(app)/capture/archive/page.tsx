import { CaptureArchiveWorkspace } from "@/features/mobile-capture/capture-archive-workspace";

export default async function CaptureArchivePage({ searchParams }: {
  searchParams: Promise<{ ownerType?: string; ownerId?: string; batch?: string; kind?: string }>;
}) {
  const params = await searchParams;
  return <CaptureArchiveWorkspace ownerType={params.ownerType} ownerId={params.ownerId} batch={params.batch} initialKind={params.kind} />;
}
