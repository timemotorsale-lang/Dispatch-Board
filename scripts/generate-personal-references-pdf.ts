import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { personalReferencesPdfBase64 } from "../src/server/services/unified-crm-contract-packet-service";

async function main() {
  const content = await personalReferencesPdfBase64({
    customerName: "",
    dealNumber: "",
    dealType: "",
    generatedAt: "",
    paymentFunding: "",
    salePrice: "",
    vehicle: { bodyStyle: "", color: "", license: "", make: "", mileage: "", model: "", stockNumber: "", trim: "", vin: "", year: "" }
  });
  writeFileSync(join(process.cwd(), "public/forms/minnesota-retail-sale/personal-references.pdf"), Buffer.from(content, "base64"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
