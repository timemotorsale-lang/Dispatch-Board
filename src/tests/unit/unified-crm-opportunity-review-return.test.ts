import { describe, expect, it } from "vitest";

import {
  buildUnifiedCrmCustomerReturn,
  DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN,
  DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN,
  DEFAULT_UNIFIED_CRM_WORK_RETURN,
  safeUnifiedCrmCustomerContextReturn,
  safeUnifiedCrmCustomerListReturn,
  safeUnifiedCrmOpportunityReturn,
  withUnifiedCrmOpportunityReturn
} from "@/server/unified-crm/opportunity-review-return";

describe("unified CRM opportunity return helpers", () => {
  it("sanitizes customer list returns with the same rules as customer detail", () => {
    expect(safeUnifiedCrmCustomerListReturn("/crm?view=customers&q=Alex&status=active&owner=mine&cursor=safe")).toBe(
      "/crm?view=customers&q=Alex&status=active&owner=mine&cursor=safe"
    );
    expect(safeUnifiedCrmCustomerListReturn(`/crm?view=customers&q=${"x".repeat(101)}&status=evil&owner=hacker&cursor=${"y".repeat(1025)}`)).toBe(
      DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN
    );
  });

  it("builds a normalized customer return href from customer id and nested list return", () => {
    expect(buildUnifiedCrmCustomerReturn("customer-1", "/crm?view=customers&status=active")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26status%3Dactive"
    );
    expect(buildUnifiedCrmCustomerReturn("customer-1", "/crm?view=work")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork"
    );
    expect(buildUnifiedCrmCustomerReturn("   ")).toBe(DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN);
  });

  it("accepts only sanctioned customer context returns", () => {
    expect(safeUnifiedCrmCustomerContextReturn("/crm?view=work")).toBe(DEFAULT_UNIFIED_CRM_WORK_RETURN);
    expect(safeUnifiedCrmCustomerContextReturn("/crm?view=work&owner=mine")).toBe(DEFAULT_UNIFIED_CRM_CUSTOMER_LIST_RETURN);
    expect(safeUnifiedCrmCustomerContextReturn("/crm?view=customers&owner=mine")).toBe("/crm?view=customers&owner=mine");
  });

  it("adds crmReturnTo to an opportunity review href without changing the route", () => {
    expect(withUnifiedCrmOpportunityReturn(
      "/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
    )).toBe(
      "/crm/opportunities/guided?crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dcustomers"
    );
  });

  it("accepts only pipeline or sanitized customer detail returns for opportunity review pages", () => {
    expect(safeUnifiedCrmOpportunityReturn("/crm?view=pipeline")).toBe(DEFAULT_UNIFIED_CRM_OPPORTUNITY_RETURN);
    expect(safeUnifiedCrmOpportunityReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers%26q%3DAlex"
    );
    expect(safeUnifiedCrmOpportunityReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork"
    );
    expect(safeUnifiedCrmOpportunityReturn("/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dpipeline")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
    );
    expect(safeUnifiedCrmOpportunityReturn("/crm/customers/customer-1?crmReturnTo=https://evil.example")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers"
    );
  });
});
