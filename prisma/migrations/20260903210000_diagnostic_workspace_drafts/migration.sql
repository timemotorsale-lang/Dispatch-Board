CREATE TABLE "DiagnosticWorkspaceDraft" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "content" JSONB NOT NULL,
  "contentHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "DiagnosticWorkspaceDraft_userId_updatedAt_idx" ON "DiagnosticWorkspaceDraft"("userId", "updatedAt");
