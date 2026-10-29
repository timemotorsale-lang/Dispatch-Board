export const paymentPaths = ["cash", "partner", "own-bank", "unsure"] as const;
export const tradeChoices = ["yes", "no", "not-now"] as const;
export type BuyingPlan = { vehicleId: string; paymentPath: typeof paymentPaths[number]; trade: typeof tradeChoices[number] };
export const paymentLabels: Record<BuyingPlan["paymentPath"], string> = { cash: "Cash purchase", partner: "Dealership partner financing", "own-bank": "My bank or credit union", unsure: "Help me choose" };
export const tradeLabels: Record<BuyingPlan["trade"], string> = { yes: "I have a trade-in", no: "No trade-in", "not-now": "Not decided" };

export function readBuyingPlan(query: URLSearchParams): BuyingPlan {
  const single = (key: string) => query.getAll(key).length === 1 ? query.get(key) || "" : "";
  const vehicle = single("vehicle");
  const payment = single("paymentPath");
  const trade = single("trade");
  return {
    vehicleId: /^[a-z0-9][a-z0-9-]{0,99}$/.test(vehicle) ? vehicle : "",
    paymentPath: paymentPaths.includes(payment as BuyingPlan["paymentPath"]) ? payment as BuyingPlan["paymentPath"] : "unsure",
    trade: tradeChoices.includes(trade as BuyingPlan["trade"]) ? trade as BuyingPlan["trade"] : "not-now"
  };
}

export function buyingLink(target: "/how-it-works" | "/purchase" | "/finance" | "/budget" | "/sell", plan: BuyingPlan, kind?: "QUESTION" | "TEST_DRIVE") {
  const clean = readBuyingPlan(new URLSearchParams({ vehicle: plan.vehicleId, paymentPath: plan.paymentPath, trade: plan.trade }));
  const query = new URLSearchParams();
  if (clean.vehicleId) query.set("vehicle", clean.vehicleId);
  query.set("paymentPath", clean.paymentPath); query.set("trade", clean.trade);
  if (kind && ["QUESTION", "TEST_DRIVE"].includes(kind)) query.set("kind", kind);
  if (target !== "/how-it-works") query.set("from", "buying-guide");
  return `${target}?${query}`;
}

export const buyingQuestions = [
  ["Can I buy without dealership financing?", "Yes, you can prepare for a cash purchase or use your own bank or credit union. Staff must still confirm the actual terms, acceptable funds and required paperwork. This preview does not process funds."],
  ["Does a payment estimate approve me for financing?", "No. The calculator is a private planning tool, not a lender quote, credit application or approval. Unknown fees must be confirmed before it shows an estimate."],
  ["Does starting a request reserve the vehicle?", "No. A request, saved vehicle or payment estimate creates no hold. Exclusive reservations require an approved policy and a verified connection to current inventory."],
  ["Can I trade in a vehicle?", "Use Sell / Trade to prepare an appraisal request. No instant price, trade tax benefit or payoff amount is assumed. A trade-in does not reduce a purchase estimate until the actual deal is reviewed."],
  ["Do I need an account to begin?", "You can browse and prepare a guest request. Production My Garage sign-in and cross-device access are not connected. Preview receipts are available only to the browser session that saved them."],
  ["Are test drives automatically booked?", "No. You can record a preferred time in the private preview, but real availability, sales hours and staff confirmation must be connected before an appointment is confirmed."],
  ["Can I sign, pay or arrange delivery here?", "Not yet. Providers, approved paperwork, funding checks, title/readiness checks and authorized release must be connected. No online deposit, signed contract or delivery is created by this guide."]
];
