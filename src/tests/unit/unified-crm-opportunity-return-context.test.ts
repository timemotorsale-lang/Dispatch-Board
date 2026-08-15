import { describe, expect, it } from "vitest";

import {
  getUnifiedCrmOpportunityReturnContext,
  withOpportunityReturnContext
} from "@/features/unified-crm/unified-crm-opportunity-return-context";

describe("unified CRM opportunity return context", () => {
  it("keeps pipeline language for pipeline-origin opportunity review", () => {
    expect(getUnifiedCrmOpportunityReturnContext("/crm?view=pipeline")).toEqual({
      backLabel: "Back to CRM Pipeline",
      returnLabel: "Return to Pipeline review",
      returnShortLabel: "Return to pipeline",
      returnContextLabel: "Pipeline return preserved"
    });
  });

  it("switches to customer language for customer-origin opportunity review", () => {
    expect(getUnifiedCrmOpportunityReturnContext("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers")).toEqual({
      backLabel: "Back to Customer 360",
      returnLabel: "Return to Customer 360",
      returnShortLabel: "Return to customer",
      returnContextLabel: "Customer 360 return preserved"
    });
  });

  it("rewrites rendered review links to preserve the active return context", () => {
    expect(withOpportunityReturnContext(
      "/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
    )).toBe(
      "/crm/opportunities/guided?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers"
    );
  });
});
