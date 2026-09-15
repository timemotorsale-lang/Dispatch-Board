import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type {
  VendorActivityType,
  VendorCategory,
  VendorInvoiceBatchStatus,
  VendorStatus,
  VendorWorkJobStatus
} from "@/server/vendors/vendor-domain";
import type {
  NormalizedVendorInvoiceBatchCloseInput,
  NormalizedVendorInvoiceBatchInput,
  NormalizedVendorInput,
  NormalizedVendorListQuery,
  NormalizedVendorWorkJobInput
} from "@/server/vendors/vendor-validation";
import { normalizeVendorName } from "@/server/vendors/vendor-validation";

type VendorUserRecord = {
  id: string;
  name: string;
  email: string;
};

export type VendorListRecord = {
  id: string;
  vendorNumber: string;
  name: string;
  normalizedName: string;
  category: VendorCategory;
  status: VendorStatus;
  primaryContactName: string | null;
  primaryPhone: string | null;
  primaryEmail: string | null;
  accountReference: string | null;
  ownerUser: VendorUserRecord | null;
  createdByUser: VendorUserRecord | null;
  updatedByUser: VendorUserRecord | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    vendorNotes: number;
    recordLinks: number;
  };
};

export type VendorProfileRecord = VendorListRecord & {
  addressSummary: string | null;
  websiteOrPortalUrl: string | null;
  notes: string | null;
  vendorNotes: Array<{
    id: string;
    body: string;
    authorUser: VendorUserRecord | null;
    createdAt: Date;
  }>;
  protectedNoteCount: number;
  activities: Array<{
    id: string;
    type: VendorActivityType;
    message: string;
    actorUser: VendorUserRecord | null;
    createdAt: Date;
  }>;
  recordLinks: Array<{
    id: string;
    recordType: string;
    recordId: string;
    labelSnapshot: string;
    relationshipType: string;
    createdAt: Date;
  }>;
  documents: Array<{
    id: string;
    title: string;
    documentType: string;
    fileName: string;
    contentType: string;
    fileSizeBytes: number;
    notes: string | null;
    uploadedByUser: VendorUserRecord | null;
    createdAt: Date;
  }>;
  workJobs: VendorWorkJobRecord[];
  invoiceBatches: VendorInvoiceBatchRecord[];
};

export type VendorRepository = ReturnType<typeof createVendorRepository>;

type VendorRow = {
  id: string;
  vendorNumber: string;
  name: string;
  normalizedName: string;
  category: VendorCategory;
  status: VendorStatus;
  primaryContactName: string | null;
  primaryPhone: string | null;
  primaryEmail: string | null;
  addressSummary: string | null;
  websiteOrPortalUrl: string | null;
  accountReference: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerUserId: string | null;
  ownerUserName: string | null;
  ownerUserEmail: string | null;
  createdByUserId: string | null;
  createdByUserName: string | null;
  createdByUserEmail: string | null;
  updatedByUserId: string | null;
  updatedByUserName: string | null;
  updatedByUserEmail: string | null;
  noteCount: bigint;
  linkedRecordCount: bigint;
};

type VendorNoteRow = {
  id: string;
  body: string;
  createdAt: Date;
  authorUserId: string | null;
  authorUserName: string | null;
  authorUserEmail: string | null;
};

type VendorProtectedNoteRow = VendorNoteRow;

type VendorActivityRow = {
  id: string;
  type: VendorActivityType;
  message: string;
  createdAt: Date;
  actorUserId: string | null;
  actorUserName: string | null;
  actorUserEmail: string | null;
};

type VendorRecordLinkRow = {
  id: string;
  recordType: string;
  recordId: string;
  labelSnapshot: string;
  relationshipType: string;
  createdAt: Date;
};

type VendorDocumentRow = {
  id: string;
  title: string;
  documentType: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  notes: string | null;
  createdAt: Date;
  uploadedByUserId: string | null;
  uploadedByUserName: string | null;
  uploadedByUserEmail: string | null;
};

type VendorDocumentDownloadRow = {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  fileData: Uint8Array;
};

export type VendorWorkJobRecord = {
  id: string;
  batchId: string | null;
  batchNumber: string | null;
  jobNumber: string;
  vehicleReference: string;
  workType: string;
  workDescription: string | null;
  serviceDate: Date;
  amount: Prisma.Decimal | string | number | null;
  status: VendorWorkJobStatus;
  notes: string | null;
  createdAt: Date;
};

export type VendorInvoiceBatchRecord = {
  id: string;
  batchNumber: string;
  title: string;
  status: VendorInvoiceBatchStatus;
  openedAt: Date;
  closedAt: Date | null;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  totalAmount: Prisma.Decimal | string | number | null;
  notes: string | null;
  jobCount: bigint;
  jobTotal: Prisma.Decimal | string | number | null;
};

function vendorId() {
  return `ven_${randomUUID()}`;
}

function userFromParts(id: string | null, name: string | null, email: string | null): VendorUserRecord | null {
  if (!id || !name || !email) return null;
  return { id, name, email };
}

function mapVendorRow(row: VendorRow): VendorListRecord {
  return {
    id: row.id,
    vendorNumber: row.vendorNumber,
    name: row.name,
    normalizedName: row.normalizedName,
    category: row.category,
    status: row.status,
    primaryContactName: row.primaryContactName,
    primaryPhone: row.primaryPhone,
    primaryEmail: row.primaryEmail,
    accountReference: row.accountReference,
    ownerUser: userFromParts(row.ownerUserId, row.ownerUserName, row.ownerUserEmail),
    createdByUser: userFromParts(row.createdByUserId, row.createdByUserName, row.createdByUserEmail),
    updatedByUser: userFromParts(row.updatedByUserId, row.updatedByUserName, row.updatedByUserEmail),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    _count: {
      recordLinks: Number(row.linkedRecordCount),
      vendorNotes: Number(row.noteCount)
    }
  };
}

function baseVendorSelect(whereSql: Prisma.Sql) {
  return Prisma.sql`
    SELECT
      v."id",
      v."vendorNumber",
      v."name",
      v."normalizedName",
      v."category",
      v."status",
      v."primaryContactName",
      v."primaryPhone",
      v."primaryEmail",
      v."addressSummary",
      v."websiteOrPortalUrl",
      v."accountReference",
      v."notes",
      v."createdAt",
      v."updatedAt",
      owner."id" AS "ownerUserId",
      owner."name" AS "ownerUserName",
      owner."email" AS "ownerUserEmail",
      creator."id" AS "createdByUserId",
      creator."name" AS "createdByUserName",
      creator."email" AS "createdByUserEmail",
      updater."id" AS "updatedByUserId",
      updater."name" AS "updatedByUserName",
      updater."email" AS "updatedByUserEmail",
      (SELECT COUNT(*) FROM "VendorNote" note WHERE note."vendorId" = v."id") AS "noteCount",
      (SELECT COUNT(*) FROM "VendorRecordLink" link WHERE link."vendorId" = v."id") AS "linkedRecordCount"
    FROM "Vendor" v
    LEFT JOIN "User" owner ON owner."id" = v."ownerUserId"
    LEFT JOIN "User" creator ON creator."id" = v."createdByUserId"
    LEFT JOIN "User" updater ON updater."id" = v."updatedByUserId"
    ${whereSql}
  `;
}

function buildVendorWhere(organizationId: string, query: NormalizedVendorListQuery) {
  const clauses = [
    Prisma.sql`v."organizationId" = ${organizationId}`,
    Prisma.sql`v."archivedAt" IS NULL`
  ];

  if (query.category) clauses.push(Prisma.sql`v."category"::text = ${query.category}`);
  if (query.status) clauses.push(Prisma.sql`v."status"::text = ${query.status}`);
  if (query.q) {
    const normalizedQuery = `%${normalizeVendorName(query.q)}%`;
    const queryText = `%${query.q}%`;
    clauses.push(Prisma.sql`(
      v."normalizedName" LIKE ${normalizedQuery}
      OR v."vendorNumber" ILIKE ${queryText}
      OR v."primaryContactName" ILIKE ${queryText}
      OR v."primaryEmail" ILIKE ${queryText}
      OR v."accountReference" ILIKE ${queryText}
    )`);
  }

  return Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
}

async function getVendorProfile(organizationId: string, vendorIdInput: string) {
  const rows = await prisma.$queryRaw<VendorRow[]>(Prisma.sql`
    ${baseVendorSelect(Prisma.sql`WHERE v."organizationId" = ${organizationId} AND v."id" = ${vendorIdInput} AND v."archivedAt" IS NULL`)}
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) return null;

  const [notes, activities, recordLinks, documents, workJobs, invoiceBatches] = await Promise.all([
    prisma.$queryRaw<VendorNoteRow[]>(Prisma.sql`
      SELECT
        note."id",
        note."body",
        note."createdAt",
        author."id" AS "authorUserId",
        author."name" AS "authorUserName",
        author."email" AS "authorUserEmail"
      FROM "VendorNote" note
      LEFT JOIN "User" author ON author."id" = note."authorUserId"
      WHERE note."organizationId" = ${organizationId} AND note."vendorId" = ${vendorIdInput}
      ORDER BY note."createdAt" DESC
      LIMIT 25
    `),
    prisma.$queryRaw<VendorActivityRow[]>(Prisma.sql`
      SELECT
        activity."id",
        activity."type",
        activity."message",
        activity."createdAt",
        actor."id" AS "actorUserId",
        actor."name" AS "actorUserName",
        actor."email" AS "actorUserEmail"
      FROM "VendorActivity" activity
      LEFT JOIN "User" actor ON actor."id" = activity."actorUserId"
      WHERE activity."organizationId" = ${organizationId} AND activity."vendorId" = ${vendorIdInput}
      ORDER BY activity."createdAt" DESC
      LIMIT 25
    `),
    prisma.$queryRaw<VendorRecordLinkRow[]>(Prisma.sql`
      SELECT "id", "recordType", "recordId", "labelSnapshot", "relationshipType", "createdAt"
      FROM "VendorRecordLink"
      WHERE "organizationId" = ${organizationId} AND "vendorId" = ${vendorIdInput}
      ORDER BY "createdAt" DESC
      LIMIT 25
    `),
    prisma.$queryRaw<VendorDocumentRow[]>(Prisma.sql`
      SELECT
        document."id",
        document."title",
        document."documentType",
        document."fileName",
        document."contentType",
        document."fileSizeBytes",
        document."notes",
        document."createdAt",
        uploader."id" AS "uploadedByUserId",
        uploader."name" AS "uploadedByUserName",
        uploader."email" AS "uploadedByUserEmail"
      FROM "VendorDocument" document
      LEFT JOIN "User" uploader ON uploader."id" = document."uploadedByUserId"
      WHERE document."organizationId" = ${organizationId} AND document."vendorId" = ${vendorIdInput}
      ORDER BY document."createdAt" DESC
      LIMIT 50
    `),
    prisma.$queryRaw<VendorWorkJobRecord[]>(Prisma.sql`
      SELECT
        job."id",
        job."batchId",
        batch."batchNumber",
        job."jobNumber",
        job."vehicleReference",
        job."workType",
        job."workDescription",
        job."serviceDate",
        job."amount",
        job."status",
        job."notes",
        job."createdAt"
      FROM "VendorWorkJob" job
      LEFT JOIN "VendorInvoiceBatch" batch ON batch."id" = job."batchId"
      WHERE job."organizationId" = ${organizationId} AND job."vendorId" = ${vendorIdInput}
      ORDER BY job."serviceDate" DESC, job."createdAt" DESC
      LIMIT 75
    `),
    prisma.$queryRaw<VendorInvoiceBatchRecord[]>(Prisma.sql`
      SELECT
        batch."id",
        batch."batchNumber",
        batch."title",
        batch."status",
        batch."openedAt",
        batch."closedAt",
        batch."invoiceNumber",
        batch."invoiceDate",
        batch."totalAmount",
        batch."notes",
        COUNT(job."id") AS "jobCount",
        COALESCE(SUM(job."amount"), 0) AS "jobTotal"
      FROM "VendorInvoiceBatch" batch
      LEFT JOIN "VendorWorkJob" job ON job."batchId" = batch."id"
      WHERE batch."organizationId" = ${organizationId} AND batch."vendorId" = ${vendorIdInput}
      GROUP BY batch."id"
      ORDER BY batch."openedAt" DESC
      LIMIT 25
    `)
  ]);

  return {
    ...mapVendorRow(row),
    activities: activities.map((activity) => ({
      actorUser: userFromParts(activity.actorUserId, activity.actorUserName, activity.actorUserEmail),
      createdAt: activity.createdAt,
      id: activity.id,
      message: activity.message,
      type: activity.type
    })),
    addressSummary: row.addressSummary,
    documents: documents.map((document) => ({
      contentType: document.contentType,
      createdAt: document.createdAt,
      documentType: document.documentType,
      fileName: document.fileName,
      fileSizeBytes: document.fileSizeBytes,
      id: document.id,
      notes: document.notes,
      title: document.title,
      uploadedByUser: userFromParts(document.uploadedByUserId, document.uploadedByUserName, document.uploadedByUserEmail)
    })),
    notes: row.notes,
    invoiceBatches,
    protectedNoteCount: await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS count FROM "VendorProtectedNote"
      WHERE "organizationId" = ${organizationId} AND "vendorId" = ${vendorIdInput}
    `).then((rows) => Number(rows[0]?.count ?? 0)),
    recordLinks,
    vendorNotes: notes.map((note) => ({
      authorUser: userFromParts(note.authorUserId, note.authorUserName, note.authorUserEmail),
      body: note.body,
      createdAt: note.createdAt,
      id: note.id
    })),
    workJobs,
    websiteOrPortalUrl: row.websiteOrPortalUrl
  } satisfies VendorProfileRecord;
}

export function createVendorRepository() {
  return {
    async listVendors(organizationId: string, query: NormalizedVendorListQuery) {
      const rows = await prisma.$queryRaw<VendorRow[]>(Prisma.sql`
        ${baseVendorSelect(buildVendorWhere(organizationId, query))}
        ORDER BY v."status" ASC, v."updatedAt" DESC, v."name" ASC
        LIMIT 100
      `);
      return rows.map(mapVendorRow);
    },
    async countVendors(organizationId: string) {
      const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS count FROM "Vendor" WHERE "organizationId" = ${organizationId} AND "archivedAt" IS NULL
      `);
      return Number(rows[0]?.count ?? 0);
    },
    async countByStatus(organizationId: string) {
      const rows = await prisma.$queryRaw<Array<{ status: VendorStatus; count: bigint }>>(Prisma.sql`
        SELECT "status", COUNT(*) AS count
        FROM "Vendor"
        WHERE "organizationId" = ${organizationId} AND "archivedAt" IS NULL
        GROUP BY "status"
      `);
      return rows.map((row) => ({ status: row.status, _count: { status: Number(row.count) } }));
    },
    async getVendor(organizationId: string, vendorIdInput: string) {
      return getVendorProfile(organizationId, vendorIdInput);
    },
    async getNextVendorNumber(organizationId: string) {
      const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS count FROM "Vendor" WHERE "organizationId" = ${organizationId}
      `);
      return `V-${String(Number(rows[0]?.count ?? 0) + 1).padStart(5, "0")}`;
    },
    async createVendor(organizationId: string, vendorNumber: string, input: NormalizedVendorInput, actorUserId: string) {
      const id = vendorId();
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "Vendor" (
          "id", "organizationId", "vendorNumber", "name", "normalizedName", "category", "status",
          "primaryContactName", "primaryPhone", "primaryEmail", "addressSummary", "websiteOrPortalUrl",
          "accountReference", "ownerUserId", "notes", "createdByUserId", "updatedByUserId", "updatedAt"
        )
        VALUES (
          ${id}, ${organizationId}, ${vendorNumber}, ${input.name}, ${normalizeVendorName(input.name)}, ${input.category}::"VendorCategory", ${input.status}::"VendorStatus",
          ${input.primaryContactName ?? null}, ${input.primaryPhone ?? null}, ${input.primaryEmail ?? null}, ${input.addressSummary ?? null}, ${input.websiteOrPortalUrl ?? null},
          ${input.accountReference ?? null}, ${input.ownerUserId ?? null}, ${input.notes ?? null}, ${actorUserId}, ${actorUserId}, CURRENT_TIMESTAMP
        )
      `);
      const vendor = await getVendorProfile(organizationId, id);
      if (!vendor) throw new Error("Vendor not found.");
      return vendor;
    },
    async updateVendor(organizationId: string, vendorIdInput: string, input: NormalizedVendorInput, actorUserId: string) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "Vendor"
        SET
          "name" = ${input.name},
          "normalizedName" = ${normalizeVendorName(input.name)},
          "category" = ${input.category}::"VendorCategory",
          "status" = ${input.status}::"VendorStatus",
          "primaryContactName" = ${input.primaryContactName ?? null},
          "primaryPhone" = ${input.primaryPhone ?? null},
          "primaryEmail" = ${input.primaryEmail ?? null},
          "addressSummary" = ${input.addressSummary ?? null},
          "websiteOrPortalUrl" = ${input.websiteOrPortalUrl ?? null},
          "accountReference" = ${input.accountReference ?? null},
          "ownerUserId" = ${input.ownerUserId ?? null},
          "notes" = ${input.notes ?? null},
          "updatedByUserId" = ${actorUserId},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "organizationId" = ${organizationId} AND "id" = ${vendorIdInput}
      `);
      const vendor = await getVendorProfile(organizationId, vendorIdInput);
      if (!vendor) throw new Error("Vendor not found.");
      return vendor;
    },
    async addNote(organizationId: string, vendorIdInput: string, authorUserId: string, body: string) {
      const id = vendorId();
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "VendorNote" ("id", "organizationId", "vendorId", "authorUserId", "body", "updatedAt")
        VALUES (${id}, ${organizationId}, ${vendorIdInput}, ${authorUserId}, ${body}, CURRENT_TIMESTAMP)
      `);
      const rows = await prisma.$queryRaw<VendorNoteRow[]>(Prisma.sql`
        SELECT
          note."id",
          note."body",
          note."createdAt",
          author."id" AS "authorUserId",
          author."name" AS "authorUserName",
          author."email" AS "authorUserEmail"
        FROM "VendorNote" note
        LEFT JOIN "User" author ON author."id" = note."authorUserId"
        WHERE note."id" = ${id}
        LIMIT 1
      `);
      const note = rows[0];
      if (!note) throw new Error("Vendor note could not be loaded.");
      return {
        authorUser: userFromParts(note.authorUserId, note.authorUserName, note.authorUserEmail),
        body: note.body,
        createdAt: note.createdAt,
        id: note.id
      };
    },
    async listProtectedNotes(organizationId: string, vendorIdInput: string) {
      const rows = await prisma.$queryRaw<VendorProtectedNoteRow[]>(Prisma.sql`
        SELECT
          note."id",
          note."body",
          note."createdAt",
          author."id" AS "authorUserId",
          author."name" AS "authorUserName",
          author."email" AS "authorUserEmail"
        FROM "VendorProtectedNote" note
        LEFT JOIN "User" author ON author."id" = note."authorUserId"
        WHERE note."organizationId" = ${organizationId} AND note."vendorId" = ${vendorIdInput}
        ORDER BY note."createdAt" DESC
        LIMIT 50
      `);
      return rows.map((note) => ({
        authorUser: userFromParts(note.authorUserId, note.authorUserName, note.authorUserEmail),
        body: note.body,
        createdAt: note.createdAt,
        id: note.id
      }));
    },
    async addProtectedNote(organizationId: string, vendorIdInput: string, authorUserId: string, body: string) {
      const id = vendorId();
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "VendorProtectedNote" ("id", "organizationId", "vendorId", "authorUserId", "body", "updatedAt")
        VALUES (${id}, ${organizationId}, ${vendorIdInput}, ${authorUserId}, ${body}, CURRENT_TIMESTAMP)
      `);
      const rows = await prisma.$queryRaw<VendorProtectedNoteRow[]>(Prisma.sql`
        SELECT
          note."id",
          note."body",
          note."createdAt",
          author."id" AS "authorUserId",
          author."name" AS "authorUserName",
          author."email" AS "authorUserEmail"
        FROM "VendorProtectedNote" note
        LEFT JOIN "User" author ON author."id" = note."authorUserId"
        WHERE note."id" = ${id}
        LIMIT 1
      `);
      const note = rows[0];
      if (!note) throw new Error("Protected vendor note could not be loaded.");
      return {
        authorUser: userFromParts(note.authorUserId, note.authorUserName, note.authorUserEmail),
        body: note.body,
        createdAt: note.createdAt,
        id: note.id
      };
    },
    async findUserPasswordHash(userId: string) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true }
      });
    },
    async addDocument(input: {
      organizationId: string;
      vendorId: string;
      uploadedByUserId: string;
      title: string;
      documentType: string;
      fileName: string;
      contentType: string;
      fileSizeBytes: number;
      fileData: Uint8Array;
      notes?: string;
    }) {
      const id = vendorId();
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "VendorDocument" (
          "id", "organizationId", "vendorId", "uploadedByUserId", "title", "documentType",
          "fileName", "contentType", "fileSizeBytes", "fileData", "notes"
        )
        VALUES (
          ${id}, ${input.organizationId}, ${input.vendorId}, ${input.uploadedByUserId}, ${input.title}, ${input.documentType},
          ${input.fileName}, ${input.contentType}, ${input.fileSizeBytes}, ${input.fileData}, ${input.notes ?? null}
        )
      `);
      const rows = await prisma.$queryRaw<VendorDocumentRow[]>(Prisma.sql`
        SELECT
          document."id",
          document."title",
          document."documentType",
          document."fileName",
          document."contentType",
          document."fileSizeBytes",
          document."notes",
          document."createdAt",
          uploader."id" AS "uploadedByUserId",
          uploader."name" AS "uploadedByUserName",
          uploader."email" AS "uploadedByUserEmail"
        FROM "VendorDocument" document
        LEFT JOIN "User" uploader ON uploader."id" = document."uploadedByUserId"
        WHERE document."id" = ${id}
        LIMIT 1
      `);
      const document = rows[0];
      if (!document) throw new Error("Vendor document could not be loaded.");
      return {
        contentType: document.contentType,
        createdAt: document.createdAt,
        documentType: document.documentType,
        fileName: document.fileName,
        fileSizeBytes: document.fileSizeBytes,
        id: document.id,
        notes: document.notes,
        title: document.title,
        uploadedByUser: userFromParts(document.uploadedByUserId, document.uploadedByUserName, document.uploadedByUserEmail)
      };
    },
    async getDocument(organizationId: string, vendorIdInput: string, documentId: string) {
      const rows = await prisma.$queryRaw<VendorDocumentDownloadRow[]>(Prisma.sql`
        SELECT "id", "title", "fileName", "contentType", "fileSizeBytes", "fileData"
        FROM "VendorDocument"
        WHERE "organizationId" = ${organizationId} AND "vendorId" = ${vendorIdInput} AND "id" = ${documentId}
        LIMIT 1
      `);
      return rows[0] ?? null;
    },
    async getNextVendorJobNumber(organizationId: string) {
      const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS count FROM "VendorWorkJob" WHERE "organizationId" = ${organizationId}
      `);
      return `VJ-${String(Number(rows[0]?.count ?? 0) + 1).padStart(5, "0")}`;
    },
    async getNextVendorBatchNumber(organizationId: string) {
      const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS count FROM "VendorInvoiceBatch" WHERE "organizationId" = ${organizationId}
      `);
      return `VB-${String(Number(rows[0]?.count ?? 0) + 1).padStart(5, "0")}`;
    },
    async getOpenInvoiceBatch(organizationId: string, vendorIdInput: string) {
      const rows = await prisma.$queryRaw<VendorInvoiceBatchRecord[]>(Prisma.sql`
        SELECT
          batch."id",
          batch."batchNumber",
          batch."title",
          batch."status",
          batch."openedAt",
          batch."closedAt",
          batch."invoiceNumber",
          batch."invoiceDate",
          batch."totalAmount",
          batch."notes",
          COUNT(job."id") AS "jobCount",
          COALESCE(SUM(job."amount"), 0) AS "jobTotal"
        FROM "VendorInvoiceBatch" batch
        LEFT JOIN "VendorWorkJob" job ON job."batchId" = batch."id"
        WHERE batch."organizationId" = ${organizationId} AND batch."vendorId" = ${vendorIdInput} AND batch."status" = 'OPEN'::"VendorInvoiceBatchStatus"
        GROUP BY batch."id"
        ORDER BY batch."openedAt" DESC
        LIMIT 1
      `);
      return rows[0] ?? null;
    },
    async getInvoiceBatchWithJobs(organizationId: string, vendorIdInput: string, batchId: string) {
      const batches = await prisma.$queryRaw<VendorInvoiceBatchRecord[]>(Prisma.sql`
        SELECT
          batch."id",
          batch."batchNumber",
          batch."title",
          batch."status",
          batch."openedAt",
          batch."closedAt",
          batch."invoiceNumber",
          batch."invoiceDate",
          batch."totalAmount",
          batch."notes",
          COUNT(job."id") AS "jobCount",
          COALESCE(SUM(job."amount"), 0) AS "jobTotal"
        FROM "VendorInvoiceBatch" batch
        LEFT JOIN "VendorWorkJob" job ON job."batchId" = batch."id"
        WHERE batch."organizationId" = ${organizationId}
          AND batch."vendorId" = ${vendorIdInput}
          AND batch."id" = ${batchId}
        GROUP BY batch."id"
        LIMIT 1
      `);
      const batch = batches[0];
      if (!batch) return null;

      const jobs = await prisma.$queryRaw<VendorWorkJobRecord[]>(Prisma.sql`
        SELECT
          job."id",
          job."batchId",
          batch."batchNumber",
          job."jobNumber",
          job."vehicleReference",
          job."workType",
          job."workDescription",
          job."serviceDate",
          job."amount",
          job."status",
          job."notes",
          job."createdAt"
        FROM "VendorWorkJob" job
        LEFT JOIN "VendorInvoiceBatch" batch ON batch."id" = job."batchId"
        WHERE job."organizationId" = ${organizationId}
          AND job."vendorId" = ${vendorIdInput}
          AND (
            job."batchId" = ${batchId}
            OR ${batch.status === "OPEN"
              ? Prisma.sql`(
              job."status" IN ('OPEN'::"VendorWorkJobStatus", 'READY_FOR_BATCH'::"VendorWorkJobStatus", 'BATCHED'::"VendorWorkJobStatus")
            )`
              : Prisma.sql`FALSE`}
          )
        ORDER BY job."serviceDate" ASC, job."createdAt" ASC
      `);

      return { batch, jobs };
    },
    async addWorkJob(input: {
      organizationId: string;
      vendorId: string;
      jobNumber: string;
      createdByUserId: string;
      openBatchId?: string;
      job: NormalizedVendorWorkJobInput;
    }) {
      const id = vendorId();
      const status = input.openBatchId ? "BATCHED" : "READY_FOR_BATCH";
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "VendorWorkJob" (
          "id", "organizationId", "vendorId", "batchId", "jobNumber", "vehicleReference",
          "workType", "workDescription", "serviceDate", "amount", "status", "notes", "createdByUserId", "updatedAt"
        )
        VALUES (
          ${id}, ${input.organizationId}, ${input.vendorId}, ${input.openBatchId ?? null}, ${input.jobNumber}, ${input.job.vehicleReference},
          ${input.job.workType}, ${input.job.workDescription ?? null}, ${input.job.serviceDate}::date, ${input.job.amount ?? null}::decimal,
          ${status}::"VendorWorkJobStatus", ${input.job.notes ?? null}, ${input.createdByUserId}, CURRENT_TIMESTAMP
        )
      `);
      const rows = await prisma.$queryRaw<VendorWorkJobRecord[]>(Prisma.sql`
        SELECT
          job."id",
          job."batchId",
          batch."batchNumber",
          job."jobNumber",
          job."vehicleReference",
          job."workType",
          job."workDescription",
          job."serviceDate",
          job."amount",
          job."status",
          job."notes",
          job."createdAt"
        FROM "VendorWorkJob" job
        LEFT JOIN "VendorInvoiceBatch" batch ON batch."id" = job."batchId"
        WHERE job."id" = ${id}
        LIMIT 1
      `);
      const job = rows[0];
      if (!job) throw new Error("Vendor job could not be loaded.");
      return job;
    },
    async updateWorkJob(input: {
      organizationId: string;
      vendorId: string;
      jobId: string;
      job: NormalizedVendorWorkJobInput;
    }) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "VendorWorkJob"
        SET
          "vehicleReference" = ${input.job.vehicleReference},
          "workType" = ${input.job.workType},
          "workDescription" = ${input.job.workDescription ?? null},
          "serviceDate" = ${input.job.serviceDate}::date,
          "amount" = ${input.job.amount ?? null}::decimal,
          "notes" = ${input.job.notes ?? null},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "organizationId" = ${input.organizationId}
          AND "vendorId" = ${input.vendorId}
          AND "id" = ${input.jobId}
      `);
      const rows = await prisma.$queryRaw<VendorWorkJobRecord[]>(Prisma.sql`
        SELECT
          job."id",
          job."batchId",
          batch."batchNumber",
          job."jobNumber",
          job."vehicleReference",
          job."workType",
          job."workDescription",
          job."serviceDate",
          job."amount",
          job."status",
          job."notes",
          job."createdAt"
        FROM "VendorWorkJob" job
        LEFT JOIN "VendorInvoiceBatch" batch ON batch."id" = job."batchId"
        WHERE job."organizationId" = ${input.organizationId}
          AND job."vendorId" = ${input.vendorId}
          AND job."id" = ${input.jobId}
        LIMIT 1
      `);
      return rows[0] ?? null;
    },
    async openInvoiceBatch(input: {
      organizationId: string;
      vendorId: string;
      batchNumber: string;
      createdByUserId: string;
      batch: NormalizedVendorInvoiceBatchInput;
      fallbackTitle: string;
    }) {
      const existingOpenBatch = await this.getOpenInvoiceBatch(input.organizationId, input.vendorId);
      if (existingOpenBatch) {
        throw new Error("This vendor already has an open batch. Close it before opening another.");
      }
      const id = vendorId();
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "VendorInvoiceBatch" (
          "id", "organizationId", "vendorId", "batchNumber", "title", "notes", "createdByUserId", "updatedAt"
        )
        VALUES (
          ${id}, ${input.organizationId}, ${input.vendorId}, ${input.batchNumber},
          ${input.batch.title ?? input.fallbackTitle}, ${input.batch.notes ?? null}, ${input.createdByUserId}, CURRENT_TIMESTAMP
        )
      `);
      return this.getOpenInvoiceBatch(input.organizationId, input.vendorId);
    },
    async closeInvoiceBatch(input: {
      organizationId: string;
      vendorId: string;
      batchId: string;
      closedByUserId: string;
      close: NormalizedVendorInvoiceBatchCloseInput;
    }) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "VendorInvoiceBatch"
        SET
          "status" = CASE WHEN ${input.close.invoiceNumber ?? null} IS NULL THEN 'CLOSED'::"VendorInvoiceBatchStatus" ELSE 'INVOICED'::"VendorInvoiceBatchStatus" END,
          "closedAt" = CURRENT_TIMESTAMP,
          "invoiceNumber" = ${input.close.invoiceNumber ?? null},
          "invoiceDate" = ${input.close.invoiceDate ?? null}::date,
          "totalAmount" = ${input.close.totalAmount ?? null}::decimal,
          "notes" = COALESCE(${input.close.notes ?? null}, "notes"),
          "closedByUserId" = ${input.closedByUserId},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "organizationId" = ${input.organizationId}
          AND "vendorId" = ${input.vendorId}
          AND "id" = ${input.batchId}
          AND "status" = 'OPEN'::"VendorInvoiceBatchStatus"
      `);
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "VendorWorkJob"
        SET
          "status" = CASE WHEN ${input.close.invoiceNumber ?? null} IS NULL THEN 'BATCHED'::"VendorWorkJobStatus" ELSE 'INVOICED'::"VendorWorkJobStatus" END,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "organizationId" = ${input.organizationId}
          AND "vendorId" = ${input.vendorId}
          AND "batchId" = ${input.batchId}
      `);
      const rows = await prisma.$queryRaw<VendorInvoiceBatchRecord[]>(Prisma.sql`
        SELECT
          batch."id",
          batch."batchNumber",
          batch."title",
          batch."status",
          batch."openedAt",
          batch."closedAt",
          batch."invoiceNumber",
          batch."invoiceDate",
          batch."totalAmount",
          batch."notes",
          COUNT(job."id") AS "jobCount",
          COALESCE(SUM(job."amount"), 0) AS "jobTotal"
        FROM "VendorInvoiceBatch" batch
        LEFT JOIN "VendorWorkJob" job ON job."batchId" = batch."id"
        WHERE batch."organizationId" = ${input.organizationId} AND batch."vendorId" = ${input.vendorId} AND batch."id" = ${input.batchId}
        GROUP BY batch."id"
        LIMIT 1
      `);
      return rows[0] ?? null;
    },
    async addActivity(input: {
      actorUserId?: string;
      message: string;
      metadata?: Prisma.InputJsonValue;
      organizationId: string;
      type: VendorActivityType;
      vendorId: string;
    }) {
      const metadata = input.metadata === undefined ? null : JSON.stringify(input.metadata);
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "VendorActivity" ("id", "organizationId", "vendorId", "actorUserId", "type", "message", "metadata")
        VALUES (${vendorId()}, ${input.organizationId}, ${input.vendorId}, ${input.actorUserId ?? null}, ${input.type}::"VendorActivityType", ${input.message}, ${metadata}::jsonb)
      `);
    },
    async linkTask(input: {
      organizationId: string;
      vendorId: string;
      taskId: string;
      labelSnapshot: string;
      createdByUserId: string;
    }) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "VendorRecordLink" ("id", "organizationId", "vendorId", "recordType", "recordId", "labelSnapshot", "relationshipType", "createdByUserId")
        VALUES (${vendorId()}, ${input.organizationId}, ${input.vendorId}, 'TASK'::"VendorRecordType", ${input.taskId}, ${input.labelSnapshot}, 'CREATED_FROM_VENDOR', ${input.createdByUserId})
      `);
    },
    async listAssignableUsers() {
      return prisma.user.findMany({
        orderBy: { name: "asc" },
        select: { email: true, id: true, name: true },
        where: { isActive: true }
      });
    }
  };
}
