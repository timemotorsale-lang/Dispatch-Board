/**
 * Optional OCR prefill for insurance proof (spec section 9). Uses the app's existing
 * on-server text reader (tesseract.js with local language files, no outside service).
 * The result is only a suggestion: the person checks each field before saving.
 */
import { extractDocumentText, type DocumentTextExtractionDependencies } from "@/server/document-library/text-extraction";

import { parseInsuranceText, type InsurancePrefill } from "../domain/insurance";
import { loadCollectionsSettings } from "./settings-store";

export async function suggestInsuranceFields(
  organizationId: string,
  file: { bytes: Uint8Array; contentType: string; fileName: string },
  dependencies: DocumentTextExtractionDependencies = {}
): Promise<InsurancePrefill | { unavailable: string }> {
  try {
    const result = await extractDocumentText(file, dependencies);
    if (!result.text) return { unavailable: result.warnings[0] ?? "No text could be read from this file. Type the details in." };
    const settings = await loadCollectionsSettings(organizationId);
    return parseInsuranceText(result.text, settings.dealership.name);
  } catch {
    return { unavailable: "The text reader couldn't read this file. Type the details in." };
  }
}
