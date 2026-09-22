import { createLocalPrivateDocumentStorageAdapter, type DocumentObjectStorageAdapter } from "./storage-adapter";

export type DocumentStorageCloudProvider = "S3" | "AZURE_BLOB" | "SHAREPOINT" | "BOX";

export type DocumentStorageRuntime = {
  adapter?: DocumentObjectStorageAdapter;
  organizationId: string;
  readiness: {
    blockers: string[];
    cloudProvider: DocumentStorageCloudProvider | null;
    localPrivateRootConfigured: boolean;
    mode: "LOCAL_PRIVATE" | "CLOUD_OBJECT_CONFIGURED" | "STAGING_ONLY";
    readyForByteStorage: boolean;
    storageRootConfigured: boolean;
  };
};

const cloudProviders = new Set<DocumentStorageCloudProvider>(["S3", "AZURE_BLOB", "SHAREPOINT", "BOX"]);

function text(value: string | undefined) {
  return value?.trim() ?? "";
}

function cloudProvider(value: string | undefined) {
  const normalized = text(value).toUpperCase().replaceAll("-", "_");
  return cloudProviders.has(normalized as DocumentStorageCloudProvider)
    ? normalized as DocumentStorageCloudProvider
    : null;
}

export function resolveDocumentStorageRuntimeFromEnv(env: NodeJS.ProcessEnv = process.env): DocumentStorageRuntime {
  const organizationId = text(env.DOCUMENT_LIBRARY_ORGANIZATION_ID) || "default-org";
  const localRoot = text(env.DOCUMENT_LIBRARY_LOCAL_STORAGE_ROOT);
  const provider = cloudProvider(env.DOCUMENT_LIBRARY_CLOUD_PROVIDER);
  const cloudBucket = text(env.DOCUMENT_LIBRARY_CLOUD_BUCKET);
  const cloudRegion = text(env.DOCUMENT_LIBRARY_CLOUD_REGION);

  if (localRoot) {
    return {
      adapter: createLocalPrivateDocumentStorageAdapter({ rootDir: localRoot }),
      organizationId,
      readiness: {
        blockers: [],
        cloudProvider: provider,
        localPrivateRootConfigured: true,
        mode: "LOCAL_PRIVATE",
        readyForByteStorage: true,
        storageRootConfigured: true
      }
    };
  }

  if (provider) {
    const blockers = [
      ...(!cloudBucket ? ["DOCUMENT_LIBRARY_CLOUD_BUCKET is required for cloud object storage."] : []),
      ...(!cloudRegion && provider !== "SHAREPOINT" && provider !== "BOX" ? ["DOCUMENT_LIBRARY_CLOUD_REGION is required for this cloud object provider."] : [])
    ];
    return {
      organizationId,
      readiness: {
        blockers,
        cloudProvider: provider,
        localPrivateRootConfigured: false,
        mode: "CLOUD_OBJECT_CONFIGURED",
        readyForByteStorage: blockers.length === 0,
        storageRootConfigured: false
      }
    };
  }

  return {
    organizationId,
    readiness: {
      blockers: ["No document byte storage root or cloud object provider is configured; uploads will remain metadata-only staged references."],
      cloudProvider: null,
      localPrivateRootConfigured: false,
      mode: "STAGING_ONLY",
      readyForByteStorage: false,
      storageRootConfigured: false
    }
  };
}
