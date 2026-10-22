# Mobile home and capture navigation

The stable mobile icon launcher is `/?view=mobile`. This explicit view works on phones, tablets and wider screens without modifying the user's account workspace preference. It can be bookmarked or used as the saved home-screen address.

All signed-in workspaces using the shared app shell show **Mobile home** and **Scan & capture** in a sticky toolbar at mobile/tablet widths. This includes manager, sales, appointments, tasks, inventory and future routes using that shell, even when a workspace hides its usual topbar. The manager menu also contains **Mobile home · navigation icons** and **Scan & capture** links.

The scanner screen has its own **Mobile home** link and a separate **Back** link. **Mobile home** always returns to the icons; **Back** returns to the source route and preserves its query parameters, including the manager mode. Unsafe external return addresses fall back to Mobile home. The shared toolbar is hidden on capture screens to avoid duplicate controls and is excluded from printing.

The icon launcher includes direct **Scan Document** and **Scan ID** cards plus **Scan & Capture** for the complete tool set. The header camera shortcut opens the capture tools instead of displaying an inert menu button. Capture shortcuts select the intended tool and destination without bypassing camera consent, ID confirmation or existing record-access checks.

The toolbar does not replace desktop navigation, override landing-page preferences, or redirect users away from a feature they are working in. It provides a consistent escape from any remembered workspace. Print/public portal routes are not mobile workspaces and do not acquire this toolbar.
# Mobile creation refinements

- Mobile home and the capture menu offer **Add Vehicle** (`/capture/vehicle`) and **Add Customer** (`/capture/customer`). Existing desktop workflows remain available.
- Vehicle: scan VIN barcode (live camera, photo, or manual entry), automatically check existing records and decode, review identity and essential acquisition/receiving information, then explicitly save inventory. Already-open inventory is linked rather than overwritten. Prices, documents and mileage remain pending, not invented. Saves reuse the atomic compact-intake service with version, permission, rollout and stable retry-key checks.
- Customer: scan the ID barcode or photograph the front/back, review extracted details, then enter phone/email. At least one contact method and confirmation are required. The existing governed customer service normalizes contacts and serializes duplicate checks. Matching contacts return an existing record without overwriting its identity data. Creation does not imply contact consent or identity verification.
- A reviewed ID in the general capture tool can open customer entry directly without copying fields. Draft ID fields remain in component memory, never URLs or browser storage. This flow does not attach ID images; the customer service retains ID last-four only. General document filing remains a separate explicit action.
- To review on a phone: open the private HTTPS preview, select Mobile home, then Add Vehicle / Add Customer. Use synthetic test data. Saving creates real records in the environment being previewed; do not use real ID information for testing. Refreshing or leaving discards unsaved drafts. Production deployment is separate from preview approval.
