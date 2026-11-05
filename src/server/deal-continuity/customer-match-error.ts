import { SalesDocumentsError } from "@/server/sales-documents/domain";
import type { DealCustomerChoice } from "@/lib/deal-continuity";

export class DealCustomerMatchError extends SalesDocumentsError {
  constructor(readonly matches: DealCustomerChoice[]) {
    super("An existing customer uses this phone or email. Review the match and select the existing customer to continue. No duplicate was created.", 409);
  }
}
