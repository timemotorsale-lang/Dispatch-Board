import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCustomerContactDetails } from "@/server/services/customer-contact-details-service";
import { UnifiedCrmCustomer360Error } from "@/server/unified-crm/customer-360-contract";
const headers = {"Cache-Control":"private, no-store", "Vary":"Cookie"};
export async function GET(_request: Request, context: {params:Promise<{customerId:string}>}) {
 try {
  const {customerId} = await context.params;
  return NextResponse.json(await getCustomerContactDetails(await getCurrentUser(),customerId),{headers});
 } catch(error) {
  return NextResponse.json({error:error instanceof UnifiedCrmCustomer360Error ? error.message : "Contact details could not be loaded. Try again."},{status:error instanceof UnifiedCrmCustomer360Error ? error.httpStatus : 503,headers});
 }
}
