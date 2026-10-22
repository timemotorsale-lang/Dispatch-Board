# Camera, barcode, ID, and document capture

Open **Capture** (`/capture`) from the app on an HTTPS address and allow camera access. There is no scanner pilot flag or allowlist. Every active signed-in account can use front-of-ID OCR; existing permissions still govern filing, opening, and changing stored customer documents.

## Available tools

- **Scan barcode / QR** reads live camera frames automatically, supports a photo fallback and connected-reader/manual input, and requires confirmation. QR links never open automatically.
- **Scan ID barcode** reads supported PDF417/AAMVA barcodes from the back of an ID. Review name, issuing state, and the masked ID number against the physical card before continuing.
- **Capture ID front / back** crops and straightens a front photo, sends it to the app's OCR service for editable field suggestions, and optionally compares name, ID number, and state with the back barcode. Changes invalidate confirmation. Mismatches require explicit manual review and remain marked in the PDF metadata and filing note.
- **Scan document** suggests page edges, offers draggable and keyboard-adjustable corners, perspective correction and optional grayscale enhancement. Review, rotate, remove and reorder up to 12 pages before creating one PDF (25 MB maximum).
- **Photo** preserves ordinary photo capture. Camera switching and flashlight controls are available in barcode mode where the device supports them.

## Review and privacy

Document editing and barcode reading happen in the browser. Front OCR sends a photo only after **Use front photo** to the signed-in app endpoint; that endpoint does not file the image or write customer records, returns no raw OCR text, and disables response caching. Final PDFs/images enter the existing review workflow only after **Accept and send**. Reviewed fields can be copied explicitly for intake; they do not automatically overwrite customer data.

Scanned PDFs contain images, not an embedded searchable text layer. Existing server OCR and document review remain available after filing. Field extraction, page detection and quality hints are suggestions, not guaranteed recognition or identity verification. Unsupported ID layouts, unread fields, glare and blur need staff review. No biometric, liveness or document-authenticity service is included.

## Acceptance checks

1. Test camera permission allowed, denied, cancelled, and resumed after backgrounding.
2. Read QR, Code 39 and Code 128 vehicle labels; confirm the VIN and decode it in Add Vehicle.
3. Use a synthetic ID front/back. Check masking, field correction, renewed confirmation, mismatch handling and the combined PDF.
4. Capture two document pages. Adjust corners, enhance, rotate, reorder, create a PDF and review all pages before filing.
5. Confirm there is no document upload before **Accept and send**, except the explicitly requested front OCR analysis.

Automated verification includes geometry/PDF, ID parsing, OCR endpoint access and intake regression tests, browser journeys with synthetic camera streams/codes, and actual local Tesseract recognition of a synthetic ID front. Physical iPhone/Android camera acceptance is still required after deployment.
