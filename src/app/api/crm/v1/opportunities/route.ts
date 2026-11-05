import { handleOpportunityCreate } from "@/server/crm-next/opportunity-create-http";

export async function POST(request: Request) {
  return handleOpportunityCreate(request);
}

