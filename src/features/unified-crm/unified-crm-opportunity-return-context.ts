export type UnifiedCrmOpportunityReturnContext = {
  backLabel: string;
  returnLabel: string;
  returnShortLabel: string;
  returnContextLabel: string;
};

function isCustomerDetailReturn(returnHref: string) {
  return returnHref.startsWith("/crm/customers/");
}

export function getUnifiedCrmOpportunityReturnContext(returnHref: string): UnifiedCrmOpportunityReturnContext {
  if (isCustomerDetailReturn(returnHref)) {
    return {
      backLabel: "Back to Customer 360",
      returnLabel: "Return to Customer 360",
      returnShortLabel: "Return to customer",
      returnContextLabel: "Customer 360 return preserved"
    };
  }

  return {
    backLabel: "Back to CRM Pipeline",
    returnLabel: "Return to Pipeline review",
    returnShortLabel: "Return to pipeline",
    returnContextLabel: "Pipeline return preserved"
  };
}

export function withOpportunityReturnContext(href: string, returnHref: string) {
  try {
    const url = new URL(href, "http://crm.local");
    url.searchParams.set("crmReturnTo", returnHref);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}
