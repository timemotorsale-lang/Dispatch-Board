import { expect, it, vi } from "vitest";
vi.mock("@/server/db/client", () => ({ prisma: {} }));
import { serviceCashActivity } from "@/server/service-billing/reporting";
import { serviceInvoiceBalance } from "@/lib/service-billing";
import type { RepairDepositEntry } from "@/server/service-billing/deposit-ledger";
it("counts January collection as January cash, February application as zero cash and one invoice credit", () => {
  const deposit = { id: "deposit", kind: "COLLECTION", amountCents: 20000, method: "CHECK", reference: "check-1", occurredAt: new Date("2026-01-20"), repairOrderId: "ro" } as RepairDepositEntry;
  expect(serviceCashActivity([], [deposit], [])[0]).toMatchObject({ kind: "DEPOSIT", cashAmountCents: 20000, invoice: "" });
  const application = { id: "apply-payment", invoiceId: "invoice", kind: "PAYMENT", amountCents: 20000, method: "CHECK", reference: "apply", occurredAt: new Date("2026-02-10"), evidence: { depositTransfer: true }, relatedEntryId: null };
  const finalPayment = { ...application, id: "final-payment", amountCents: 30000, evidence: {} };
  expect(serviceCashActivity([application, finalPayment], [{ ...deposit, id: "apply", kind: "APPLY" }], [{ id: "invoice", invoiceNumber: "INV-1" }])).toEqual([expect.objectContaining({ receiptId: "final-payment", cashAmountCents: 30000 })]);
  expect(serviceInvoiceBalance({ totalCents: 50000, status: "POSTED" }, [application, finalPayment])).toMatchObject({ netPaidCents: 50000, balanceCents: 0 });
});
it("excludes internal reversal and counts only the subsequent deposit cash refund", () => {
  const at = new Date("2026-02-11");
  const reversal = { id: "reverse-payment", invoiceId: "invoice", kind: "REFUND", amountCents: 5000, method: "CHECK", reference: "reverse", occurredAt: at, evidence: { depositTransfer: true } };
  const refund = { id: "cash-refund", kind: "REFUND", amountCents: 5000, method: "CHECK", reference: "cash", occurredAt: at } as RepairDepositEntry;
  expect(serviceCashActivity([reversal], [refund], [])).toEqual([expect.objectContaining({ receiptId: "cash-refund", cashAmountCents: -5000 })]);
});
