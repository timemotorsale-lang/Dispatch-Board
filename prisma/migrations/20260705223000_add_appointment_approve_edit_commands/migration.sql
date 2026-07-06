-- Add first-class EAPT-027 approval and edit command types without rewriting existing ledger rows.
ALTER TYPE "AppointmentCommandType" ADD VALUE IF NOT EXISTS 'APPROVE';
ALTER TYPE "AppointmentCommandType" ADD VALUE IF NOT EXISTS 'EDIT';
