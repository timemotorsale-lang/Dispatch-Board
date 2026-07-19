-- Add a terminal, non-destructive acquisition reversal outcome.
ALTER TYPE "InventoryAcquisitionCaseStatus" ADD VALUE IF NOT EXISTS 'REVERSED';
