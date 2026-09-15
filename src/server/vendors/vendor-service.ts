import { TaskTemplatePriority, WorkflowArea } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { verifyPassword } from "@/server/auth/password";
import type { AuthenticatedUser } from "@/server/auth/store";
import { createManualTask } from "@/server/services/task-create-service";
import {
  assertVendorCreateAccess,
  assertVendorNoteAccess,
  assertVendorRegistryAccess,
  assertVendorTaskAccess,
  assertVendorUpdateAccess,
  canCreateVendor,
  canUpdateVendor
} from "@/server/vendors/vendor-policy";
import { createVendorRepository, type VendorRepository } from "@/server/vendors/vendor-repository";
import {
  normalizeVendorInput,
  normalizeVendorInvoiceBatchCloseInput,
  normalizeVendorInvoiceBatchInput,
  normalizeVendorListQuery,
  normalizeVendorNoteInput,
  normalizeVendorTaskInput,
  normalizeVendorWorkJobInput,
  type NormalizedVendorListQuery
} from "@/server/vendors/vendor-validation";
import {
  VENDOR_CATEGORY_LABELS,
  VENDOR_CATEGORY_OPTIONS,
  VENDOR_STATUS_LABELS,
  VENDOR_STATUS_OPTIONS,
  type VendorStatus,
  isVendorWarningStatus
} from "@/server/vendors/vendor-domain";

export type VendorUserSummary = {
  id: string;
  name: string;
  email?: string;
};

export type VendorListItem = {
  id: string;
  vendorNumber: string;
  name: string;
  category: string;
  categoryLabel: string;
  status: string;
  statusLabel: string;
  warning: boolean;
  primaryContactName: string | null;
  primaryPhone: string | null;
  primaryEmail: string | null;
  accountReference: string | null;
  ownerUser: VendorUserSummary | null;
  noteCount: number;
  linkedRecordCount: number;
  updatedAt: string;
};

export type VendorProfile = VendorListItem & {
  addressSummary: string | null;
  websiteOrPortalUrl: string | null;
  notes: string | null;
  createdAt: string;
  createdByUser: VendorUserSummary | null;
  updatedByUser: VendorUserSummary | null;
  vendorNotes: Array<{
    id: string;
    body: string;
    authorUser: VendorUserSummary | null;
    createdAt: string;
  }>;
  activities: Array<{
    id: string;
    type: string;
    message: string;
    actorUser: VendorUserSummary | null;
    createdAt: string;
  }>;
  recordLinks: Array<{
    id: string;
    recordType: string;
    recordId: string;
    labelSnapshot: string;
    relationshipType: string;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    documentType: string;
    fileName: string;
    contentType: string;
    fileSizeBytes: number;
    notes: string | null;
    uploadedByUser: VendorUserSummary | null;
    createdAt: string;
    downloadHref: string;
    viewHref: string;
  }>;
  protectedNoteCount: number;
  workJobs: Array<{
    id: string;
    batchId: string | null;
    batchNumber: string | null;
    jobNumber: string;
    vehicleReference: string;
    workType: string;
    workDescription: string | null;
    serviceDate: string;
    amount: number | null;
    status: string;
    notes: string | null;
    createdAt: string;
  }>;
  invoiceBatches: Array<{
    id: string;
    batchNumber: string;
    title: string;
    status: string;
    openedAt: string;
    closedAt: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    totalAmount: number | null;
    notes: string | null;
    jobCount: number;
    jobTotal: number;
  }>;
};

export type VendorRegistryReadModel = {
  vendors: VendorListItem[];
  stats: {
    total: number;
    preferred: number;
    warning: number;
    doNotUse: number;
  };
  categoryOptions: typeof VENDOR_CATEGORY_OPTIONS;
  statusOptions: typeof VENDOR_STATUS_OPTIONS;
  assignableUsers: VendorUserSummary[];
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
  };
  generatedAt: string;
};

export type VendorProfileReadModel = Awaited<ReturnType<typeof getVendorProfile>>;

function toUserSummary(user: { id: string; name: string; email: string } | null): VendorUserSummary | null {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email || undefined };
}

function toVendorLocalTimestamp(value: Date) {
  return value.toISOString().replace(/Z$/, "");
}

function toDateOnly(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toMoneyNumber(value: { toString(): string } | string | number | null) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

function toWorkJobModel(job: NonNullable<Awaited<ReturnType<VendorRepository["getVendor"]>>>["workJobs"][number]) {
  return {
    id: job.id,
    amount: toMoneyNumber(job.amount),
    batchId: job.batchId,
    batchNumber: job.batchNumber,
    createdAt: toVendorLocalTimestamp(job.createdAt),
    jobNumber: job.jobNumber,
    notes: job.notes,
    serviceDate: toDateOnly(job.serviceDate) ?? "",
    status: job.status,
    vehicleReference: job.vehicleReference,
    workDescription: job.workDescription,
    workType: job.workType
  };
}

function toInvoiceBatchModel(batch: NonNullable<Awaited<ReturnType<VendorRepository["getVendor"]>>>["invoiceBatches"][number]) {
  return {
    id: batch.id,
    batchNumber: batch.batchNumber,
    title: batch.title,
    status: batch.status,
    openedAt: toVendorLocalTimestamp(batch.openedAt),
    closedAt: batch.closedAt ? toVendorLocalTimestamp(batch.closedAt) : null,
    invoiceNumber: batch.invoiceNumber,
    invoiceDate: toDateOnly(batch.invoiceDate),
    totalAmount: toMoneyNumber(batch.totalAmount),
    notes: batch.notes,
    jobCount: Number(batch.jobCount),
    jobTotal: toMoneyNumber(batch.jobTotal) ?? 0
  };
}

function toListItem(vendor: Awaited<ReturnType<VendorRepository["listVendors"]>>[number]): VendorListItem {
  return {
    id: vendor.id,
    vendorNumber: vendor.vendorNumber,
    name: vendor.name,
    category: vendor.category,
    categoryLabel: VENDOR_CATEGORY_LABELS[vendor.category],
    status: vendor.status,
    statusLabel: VENDOR_STATUS_LABELS[vendor.status],
    warning: isVendorWarningStatus(vendor.status),
    primaryContactName: vendor.primaryContactName,
    primaryPhone: vendor.primaryPhone,
    primaryEmail: vendor.primaryEmail,
    accountReference: vendor.accountReference,
    ownerUser: toUserSummary(vendor.ownerUser),
    noteCount: vendor._count.vendorNotes,
    linkedRecordCount: vendor._count.recordLinks,
    updatedAt: toVendorLocalTimestamp(vendor.updatedAt)
  };
}

function toProfile(vendor: NonNullable<Awaited<ReturnType<VendorRepository["getVendor"]>>>): VendorProfile {
  return {
    ...toListItem({ ...vendor, _count: { vendorNotes: vendor.vendorNotes.length, recordLinks: vendor.recordLinks.length } }),
    addressSummary: vendor.addressSummary,
    websiteOrPortalUrl: vendor.websiteOrPortalUrl,
    notes: vendor.notes,
    protectedNoteCount: vendor.protectedNoteCount,
    invoiceBatches: vendor.invoiceBatches.map(toInvoiceBatchModel),
    createdAt: toVendorLocalTimestamp(vendor.createdAt),
    createdByUser: toUserSummary(vendor.createdByUser),
    updatedByUser: toUserSummary(vendor.updatedByUser),
    vendorNotes: vendor.vendorNotes.map((note) => ({
      id: note.id,
      authorUser: toUserSummary(note.authorUser),
      body: note.body,
      createdAt: toVendorLocalTimestamp(note.createdAt)
    })),
    activities: vendor.activities.map((activity) => ({
      id: activity.id,
      actorUser: toUserSummary(activity.actorUser),
      message: activity.message,
      type: activity.type,
      createdAt: toVendorLocalTimestamp(activity.createdAt)
    })),
    recordLinks: vendor.recordLinks.map((link) => ({
      id: link.id,
      labelSnapshot: link.labelSnapshot,
      recordId: link.recordId,
      recordType: link.recordType,
      relationshipType: link.relationshipType,
      createdAt: toVendorLocalTimestamp(link.createdAt)
    })),
    documents: vendor.documents.map((document) => ({
      id: document.id,
      contentType: document.contentType,
      createdAt: toVendorLocalTimestamp(document.createdAt),
      documentType: document.documentType,
      downloadHref: `/api/vendors/${vendor.id}/documents/${document.id}?download=1`,
      fileName: document.fileName,
      fileSizeBytes: document.fileSizeBytes,
      notes: document.notes,
      title: document.title,
      uploadedByUser: toUserSummary(document.uploadedByUser),
      viewHref: `/api/vendors/${vendor.id}/documents/${document.id}`
    })),
    workJobs: vendor.workJobs.map(toWorkJobModel)
  };
}

function normalizeProtectedAccessPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Protected access code is required.");
  }
  const payload = value as Record<string, unknown>;
  if (typeof payload.accessCode !== "string" || !payload.accessCode.trim()) {
    throw new Error("Protected access code is required.");
  }
  return {
    accessCode: payload.accessCode,
    body: typeof payload.body === "string" ? payload.body.trim() : ""
  };
}

async function assertProtectedVendorAccess(user: AuthenticatedUser, repository: VendorRepository, accessCode: string) {
  const userPassword = await repository.findUserPasswordHash(user.id);
  if (!userPassword || !(await verifyPassword(accessCode, userPassword.passwordHash))) {
    throw new Error("Protected access code is incorrect.");
  }
}

function toProtectedNoteModel(note: Awaited<ReturnType<VendorRepository["listProtectedNotes"]>>[number]) {
  return {
    id: note.id,
    authorUser: toUserSummary(note.authorUser),
    body: note.body,
    createdAt: toVendorLocalTimestamp(note.createdAt)
  };
}

function statsFromStatusGroups(total: number, groups: Awaited<ReturnType<VendorRepository["countByStatus"]>>) {
  const countFor = (status: VendorStatus) =>
    groups.find((group) => group.status === status)?._count.status ?? 0;

  return {
    total,
    preferred: countFor("PREFERRED"),
    warning: countFor("PENDING_REVIEW") + countFor("DO_NOT_USE"),
    doNotUse: countFor("DO_NOT_USE")
  };
}

function errorForMissingVendor() {
  return new Error("Vendor not found.");
}

export async function getVendorRegistryReadModel(
  user: AuthenticatedUser | null,
  query: NormalizedVendorListQuery = {},
  dependencies?: { repository?: VendorRepository; organizationId?: string }
): Promise<VendorRegistryReadModel> {
  assertVendorRegistryAccess(user);
  const repository = dependencies?.repository ?? createVendorRepository();
  const organizationId = dependencies?.organizationId ?? INITIAL_ORGANIZATION.id;
  const [vendors, total, groups, users] = await Promise.all([
    repository.listVendors(organizationId, query),
    repository.countVendors(organizationId),
    repository.countByStatus(organizationId),
    repository.listAssignableUsers()
  ]);

  return {
    vendors: vendors.map(toListItem),
    stats: statsFromStatusGroups(total, groups),
    categoryOptions: VENDOR_CATEGORY_OPTIONS,
    statusOptions: VENDOR_STATUS_OPTIONS,
    assignableUsers: users.map(toUserSummary).filter((userSummary): userSummary is VendorUserSummary => Boolean(userSummary)),
    permissions: {
      canCreate: canCreateVendor(user),
      canUpdate: canUpdateVendor(user)
    },
    generatedAt: new Date().toISOString()
  };
}

export async function getVendorProfile(
  user: AuthenticatedUser | null,
  vendorId: string,
  dependencies?: { repository?: VendorRepository; organizationId?: string }
) {
  assertVendorRegistryAccess(user);
  const repository = dependencies?.repository ?? createVendorRepository();
  const organizationId = dependencies?.organizationId ?? INITIAL_ORGANIZATION.id;
  const vendor = await repository.getVendor(organizationId, vendorId);

  if (!vendor) {
    throw errorForMissingVendor();
  }

  return {
    vendor: toProfile(vendor),
    categoryOptions: VENDOR_CATEGORY_OPTIONS,
    statusOptions: VENDOR_STATUS_OPTIONS,
    assignableUsers: (await repository.listAssignableUsers())
      .map(toUserSummary)
      .filter((userSummary): userSummary is VendorUserSummary => Boolean(userSummary)),
    permissions: {
      canCreate: canCreateVendor(user),
      canUpdate: canUpdateVendor(user)
    },
    generatedAt: new Date().toISOString()
  };
}

export async function getVendorInvoiceBatchJobs(user: AuthenticatedUser | null, vendorId: string, batchId: string) {
  assertVendorRegistryAccess(user);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const batchWithJobs = await repository.getInvoiceBatchWithJobs(organizationId, vendorId, batchId);
  if (!batchWithJobs) {
    throw new Error("Vendor batch not found.");
  }
  const jobs = batchWithJobs.jobs.map(toWorkJobModel);
  const visibleJobTotal = jobs.reduce((total, job) => total + (job.amount ?? 0), 0);
  const batch = toInvoiceBatchModel(batchWithJobs.batch);

  return {
    batch: {
      ...batch,
      jobCount: jobs.length,
      jobTotal: visibleJobTotal
    },
    jobs,
    generatedAt: toVendorLocalTimestamp(new Date())
  };
}

export async function createVendor(user: AuthenticatedUser | null, payload: unknown) {
  assertVendorCreateAccess(user);
  const input = normalizeVendorInput(payload);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const vendorNumber = await repository.getNextVendorNumber(organizationId);
  const vendor = await repository.createVendor(organizationId, vendorNumber, input, user.id);
  await repository.addActivity({
    actorUserId: user.id,
    message: `Vendor created: ${vendor.name}`,
    metadata: { category: vendor.category, status: vendor.status },
    organizationId,
    type: "VENDOR_CREATED",
    vendorId: vendor.id
  });
  return { vendor: toProfile(vendor) };
}

export async function updateVendor(user: AuthenticatedUser | null, vendorId: string, payload: unknown) {
  assertVendorUpdateAccess(user);
  const input = normalizeVendorInput(payload);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const existingVendor = await repository.getVendor(organizationId, vendorId);
  if (!existingVendor) throw errorForMissingVendor();
  const vendor = await repository.updateVendor(organizationId, vendorId, input, user.id);
  await repository.addActivity({
    actorUserId: user.id,
    message: existingVendor.status === vendor.status
      ? `Vendor updated: ${vendor.name}`
      : `Vendor status changed to ${VENDOR_STATUS_LABELS[vendor.status]}`,
    metadata: {
      category: vendor.category,
      previousStatus: existingVendor.status,
      status: vendor.status
    },
    organizationId,
    type: existingVendor.status === vendor.status ? "VENDOR_UPDATED" : "STATUS_CHANGED",
    vendorId: vendor.id
  });
  return { vendor: toProfile(vendor) };
}

export async function addVendorNote(user: AuthenticatedUser | null, vendorId: string, payload: unknown) {
  assertVendorNoteAccess(user);
  const input = normalizeVendorNoteInput(payload);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const vendor = await repository.getVendor(organizationId, vendorId);
  if (!vendor) throw errorForMissingVendor();
  const note = await repository.addNote(organizationId, vendorId, user.id, input.body);
  await repository.addActivity({
    actorUserId: user.id,
    message: `Update added by ${user.name}`,
    metadata: { noteId: note.id },
    organizationId,
    type: "NOTE_ADDED",
    vendorId
  });
  return {
    note: {
      id: note.id,
      authorUser: toUserSummary(note.authorUser),
      body: note.body,
      createdAt: toVendorLocalTimestamp(note.createdAt)
    }
  };
}

export async function unlockVendorProtectedNotes(user: AuthenticatedUser | null, vendorId: string, payload: unknown) {
  assertVendorRegistryAccess(user);
  const input = normalizeProtectedAccessPayload(payload);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const vendor = await repository.getVendor(organizationId, vendorId);
  if (!vendor) throw errorForMissingVendor();
  await assertProtectedVendorAccess(user, repository, input.accessCode);
  const notes = await repository.listProtectedNotes(organizationId, vendorId);
  return {
    notes: notes.map(toProtectedNoteModel),
    unlockedAt: toVendorLocalTimestamp(new Date())
  };
}

export async function addVendorProtectedNote(user: AuthenticatedUser | null, vendorId: string, payload: unknown) {
  assertVendorNoteAccess(user);
  const input = normalizeProtectedAccessPayload(payload);
  if (!input.body) {
    throw new Error("Protected note is required.");
  }
  if (input.body.length > 2000) {
    throw new Error("Protected note must be 2000 characters or fewer.");
  }
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const vendor = await repository.getVendor(organizationId, vendorId);
  if (!vendor) throw errorForMissingVendor();
  await assertProtectedVendorAccess(user, repository, input.accessCode);
  const note = await repository.addProtectedNote(organizationId, vendorId, user.id, input.body);
  await repository.addActivity({
    actorUserId: user.id,
    message: `Protected note added by ${user.name}`,
    metadata: { noteId: note.id },
    organizationId,
    type: "PROTECTED_NOTE_ADDED",
    vendorId
  });
  return {
    note: toProtectedNoteModel(note)
  };
}

function normalizeDocumentText(value: FormDataEntryValue | null, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const normalizedValue = value.trim();
  if (!normalizedValue) return fallback;
  if (normalizedValue.length > maxLength) {
    throw new Error(`Document field must be ${maxLength} characters or fewer.`);
  }
  return normalizedValue;
}

function normalizeDocumentNotes(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const normalizedValue = value.trim();
  if (!normalizedValue) return undefined;
  if (normalizedValue.length > 1200) throw new Error("Document notes must be 1200 characters or fewer.");
  return normalizedValue;
}

function assertVendorUploadFile(value: FormDataEntryValue | null): asserts value is File {
  if (!(value instanceof File)) {
    throw new Error("Choose a file to upload.");
  }

  if (value.size <= 0) {
    throw new Error("Uploaded file is empty.");
  }

  if (value.size > 10 * 1024 * 1024) {
    throw new Error("Vendor document uploads are limited to 10 MB.");
  }
}

export async function uploadVendorDocument(user: AuthenticatedUser | null, vendorId: string, formData: FormData) {
  assertVendorNoteAccess(user);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const vendor = await repository.getVendor(organizationId, vendorId);
  if (!vendor) throw errorForMissingVendor();

  const file = formData.get("file");
  assertVendorUploadFile(file);
  const title = normalizeDocumentText(formData.get("title"), file.name, 160);
  const documentType = normalizeDocumentText(formData.get("documentType"), "GENERAL", 80).toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const notes = normalizeDocumentNotes(formData.get("notes"));
  const fileData = new Uint8Array(await file.arrayBuffer());
  const document = await repository.addDocument({
    contentType: file.type || "application/octet-stream",
    documentType,
    fileData,
    fileName: file.name,
    fileSizeBytes: file.size,
    notes,
    organizationId,
    title,
    uploadedByUserId: user.id,
    vendorId
  });

  await repository.addActivity({
    actorUserId: user.id,
    message: `Document uploaded: ${document.title}`,
    metadata: { documentId: document.id, fileName: document.fileName },
    organizationId,
    type: "DOCUMENT_UPLOADED",
    vendorId
  });

  return {
    document: {
      id: document.id,
      contentType: document.contentType,
      createdAt: toVendorLocalTimestamp(document.createdAt),
      documentType: document.documentType,
      downloadHref: `/api/vendors/${vendorId}/documents/${document.id}?download=1`,
      fileName: document.fileName,
      fileSizeBytes: document.fileSizeBytes,
      notes: document.notes,
      title: document.title,
      uploadedByUser: toUserSummary(document.uploadedByUser),
      viewHref: `/api/vendors/${vendorId}/documents/${document.id}`
    }
  };
}

export async function getVendorDocumentDownload(user: AuthenticatedUser | null, vendorId: string, documentId: string) {
  assertVendorRegistryAccess(user);
  const repository = createVendorRepository();
  const document = await repository.getDocument(INITIAL_ORGANIZATION.id, vendorId, documentId);
  if (!document) throw new Error("Vendor document not found.");
  return document;
}

function defaultBatchTitle(vendorName: string) {
  return `${vendorName} batch - ${new Intl.DateTimeFormat([], { dateStyle: "medium" }).format(new Date())}`;
}

function buildJobNumbers(firstJobNumber: string, count: number) {
  const match = /^VJ-(\d+)$/.exec(firstJobNumber);
  if (!match) return Array.from({ length: count }, (_, index) => `${firstJobNumber}-${index + 1}`);
  const firstNumber = Number(match[1]);
  const width = match[1].length;
  return Array.from({ length: count }, (_, index) => `VJ-${String(firstNumber + index).padStart(width, "0")}`);
}

export async function recordVendorWorkJob(user: AuthenticatedUser | null, vendorId: string, payload: unknown) {
  assertVendorNoteAccess(user);
  const input = normalizeVendorWorkJobInput(payload);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const vendor = await repository.getVendor(organizationId, vendorId);
  if (!vendor) throw errorForMissingVendor();

  const [jobNumber, openBatch] = await Promise.all([
    repository.getNextVendorJobNumber(organizationId),
    repository.getOpenInvoiceBatch(organizationId, vendorId)
  ]);
  const vehicleReferences = [input.vehicleReference, ...input.additionalVehicleReferences];
  const jobNumbers = buildJobNumbers(jobNumber, vehicleReferences.length);
  const jobs = await Promise.all(vehicleReferences.map((vehicleReference, index) =>
    repository.addWorkJob({
      createdByUserId: user.id,
      job: {
        ...input,
        additionalVehicleReferences: [],
        vehicleReference
      },
      jobNumber: jobNumbers[index],
      openBatchId: openBatch?.id,
      organizationId,
      vendorId
    })
  ));
  const job = jobs[0];
  await repository.addActivity({
    actorUserId: user.id,
    message: jobs.length === 1 ? `Job recorded: ${job.vehicleReference}` : `${jobs.length} vendor jobs recorded`,
    metadata: {
      batchId: job.batchId,
      jobIds: jobs.map((savedJob) => savedJob.id),
      jobNumbers: jobs.map((savedJob) => savedJob.jobNumber),
      workType: job.workType
    },
    organizationId,
    type: "JOB_RECORDED",
    vendorId
  });

  const freshVendor = await repository.getVendor(organizationId, vendorId);
  if (!freshVendor) throw errorForMissingVendor();

  return {
    job: {
      id: job.id,
      amount: toMoneyNumber(job.amount),
      batchId: job.batchId,
      batchNumber: job.batchNumber,
      createdAt: toVendorLocalTimestamp(job.createdAt),
      jobNumber: job.jobNumber,
      notes: job.notes,
      serviceDate: toDateOnly(job.serviceDate) ?? "",
      status: job.status,
      vehicleReference: job.vehicleReference,
      workDescription: job.workDescription,
      workType: job.workType
    },
    vendor: toProfile(freshVendor)
  };
}

export async function updateVendorWorkJob(user: AuthenticatedUser | null, vendorId: string, jobId: string, payload: unknown) {
  assertVendorNoteAccess(user);
  const input = normalizeVendorWorkJobInput(payload);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const vendor = await repository.getVendor(organizationId, vendorId);
  if (!vendor) throw errorForMissingVendor();
  const job = await repository.updateWorkJob({
    job: {
      ...input,
      additionalVehicleReferences: []
    },
    jobId,
    organizationId,
    vendorId
  });
  if (!job) throw new Error("Vendor job not found.");
  await repository.addActivity({
    actorUserId: user.id,
    message: `Job updated: ${job.vehicleReference}`,
    metadata: { jobId: job.id, jobNumber: job.jobNumber, workType: job.workType },
    organizationId,
    type: "VENDOR_UPDATED",
    vendorId
  });

  const freshVendor = await repository.getVendor(organizationId, vendorId);
  if (!freshVendor) throw errorForMissingVendor();

  return {
    job: toWorkJobModel(job),
    vendor: toProfile(freshVendor)
  };
}

export async function openVendorInvoiceBatch(user: AuthenticatedUser | null, vendorId: string, payload: unknown) {
  assertVendorNoteAccess(user);
  const input = normalizeVendorInvoiceBatchInput(payload);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const vendor = await repository.getVendor(organizationId, vendorId);
  if (!vendor) throw errorForMissingVendor();
  const batchNumber = await repository.getNextVendorBatchNumber(organizationId);
  const batch = await repository.openInvoiceBatch({
    batch: input,
    batchNumber,
    createdByUserId: user.id,
    fallbackTitle: defaultBatchTitle(vendor.name),
    organizationId,
    vendorId
  });
  if (!batch) throw new Error("Vendor batch could not be opened.");
  await repository.addActivity({
    actorUserId: user.id,
    message: `Batch opened: ${batch.batchNumber}`,
    metadata: { batchId: batch.id, batchNumber: batch.batchNumber },
    organizationId,
    type: "BATCH_OPENED",
    vendorId
  });
  return { vendor: toProfile(await repository.getVendor(organizationId, vendorId).then((freshVendor) => {
    if (!freshVendor) throw errorForMissingVendor();
    return freshVendor;
  })) };
}

export async function closeVendorInvoiceBatch(user: AuthenticatedUser | null, vendorId: string, batchId: string, payload: unknown) {
  assertVendorNoteAccess(user);
  const input = normalizeVendorInvoiceBatchCloseInput(payload);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const vendor = await repository.getVendor(organizationId, vendorId);
  if (!vendor) throw errorForMissingVendor();
  const batch = await repository.closeInvoiceBatch({
    batchId,
    close: input,
    closedByUserId: user.id,
    organizationId,
    vendorId
  });
  if (!batch) throw new Error("Open batch not found.");
  await repository.addActivity({
    actorUserId: user.id,
    message: `Batch closed: ${batch.batchNumber}`,
    metadata: { batchId: batch.id, batchNumber: batch.batchNumber, invoiceNumber: batch.invoiceNumber },
    organizationId,
    type: "BATCH_CLOSED",
    vendorId
  });
  return { vendor: toProfile(await repository.getVendor(organizationId, vendorId).then((freshVendor) => {
    if (!freshVendor) throw errorForMissingVendor();
    return freshVendor;
  })) };
}

export async function createVendorTask(user: AuthenticatedUser | null, vendorId: string, payload: unknown) {
  assertVendorTaskAccess(user);
  const input = normalizeVendorTaskInput(payload);
  const repository = createVendorRepository();
  const organizationId = INITIAL_ORGANIZATION.id;
  const vendor = await repository.getVendor(organizationId, vendorId);
  if (!vendor) throw errorForMissingVendor();

  const task = await createManualTask(user, {
    assignedUserId: user.id,
    boardDate: input.boardDate,
    customerReference: vendor.name,
    description: input.description || `Follow up with ${vendor.name} from Vendor Registry.`,
    dueAt: input.dueAt.toISOString(),
    intakeMetadata: {
      channel: "Vendor Registry",
      expectedOutcome: "Resolve the vendor follow-up and record the outcome back on the vendor profile.",
      intakeType: "vendor follow-up",
      requiredUpdates: ["Record vendor outcome", "Update vendor profile notes if needed"]
    },
    priority: TaskTemplatePriority.MEDIUM,
    requiresManagerApproval: false,
    status: "NOT_STARTED",
    title: input.title,
    workflowArea: WorkflowArea.ADMIN
  });

  await repository.linkTask({
    createdByUserId: user.id,
    labelSnapshot: task.title,
    organizationId,
    taskId: task.id,
    vendorId
  });
  await repository.addActivity({
    actorUserId: user.id,
    message: `Task created: ${task.title}`,
    metadata: { taskId: task.id },
    organizationId,
    type: "TASK_CREATED",
    vendorId
  });

  return { task };
}

export { normalizeVendorListQuery };
