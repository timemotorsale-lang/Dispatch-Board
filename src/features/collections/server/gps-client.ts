/**
 * Advantage GPS client (spec section 10).
 *
 * The screens talk to this interface only. In Release 1 the only implementation is MANUAL:
 * it never contacts Advantage. It gives the person the portal link and instructions, and they
 * do the disable/enable in the Advantage portal themselves, then press "Done in portal".
 * A real API client can be added later behind COLLECTIONS_INTEGRATION_GPS without changing
 * the screens. Even then, a person must approve every disable and enable.
 */
import { resolveIntegrationMode } from "../config/flags";

export type GpsCommandResult = { mode: "MANUAL"; done: false; portalUrl: string | null; instructions: string };
export type GpsStatus = { mode: "MANUAL"; known: false; portalUrl: string | null };

export interface AdvantageGpsClient {
  readonly mode: "MANUAL";
  locate(deviceSerial: string | null): Promise<GpsCommandResult>;
  disable(deviceSerial: string | null): Promise<GpsCommandResult>;
  enable(deviceSerial: string | null): Promise<GpsCommandResult>;
  status(deviceSerial: string | null): Promise<GpsStatus>;
}

export function createManualGpsClient(portalUrl: string | null): AdvantageGpsClient {
  const url = portalUrl?.trim() || null;
  const steps = (what: string, serial: string | null) =>
    `Open the Advantage GPS portal${url ? "" : " (add its link in Collections Settings)"}, find device ${serial || "(serial not on file; search by VIN or customer)"}, and ${what}. Then come back and press "Done in portal".`;
  return {
    mode: "MANUAL",
    locate: async serial => ({ mode: "MANUAL", done: false, portalUrl: url, instructions: steps("use Locate", serial) }),
    disable: async serial => ({ mode: "MANUAL", done: false, portalUrl: url, instructions: steps("choose Starter Disable", serial) }),
    enable: async serial => ({ mode: "MANUAL", done: false, portalUrl: url, instructions: steps("choose Starter Enable", serial) }),
    status: async () => ({ mode: "MANUAL", known: false, portalUrl: url })
  };
}

/** Release 1 always returns the manual client, whatever COLLECTIONS_INTEGRATION_GPS says. */
export function gpsClientFor(portalUrl: string | null): AdvantageGpsClient {
  void resolveIntegrationMode("COLLECTIONS_INTEGRATION_GPS");
  return createManualGpsClient(portalUrl);
}
