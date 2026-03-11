/**
 * Client MAC for report access lock (machine restriction).
 *
 * HOW THE MAC IS SENT EVERY TIME:
 * 1. In api.ts, a request interceptor runs before EVERY outgoing HTTP request.
 * 2. If the request URL contains "/reports/", the interceptor calls getClientMacForRequest().
 * 3. getClientMacForRequest() returns the MAC from:
 *    - sessionStorage (if we already have it), OR
 *    - one-time fetch from a local service (VITE_MAC_SERVICE_URL/mac), then we store it in sessionStorage.
 * 4. If a MAC is returned, the interceptor sets the header: config.headers["X-Client-MAC"] = mac.
 * So the same MAC is sent on every report API call (getPaginatedData, searchByColumn, execute, etc.).
 *
 * WHERE THE MAC VALUE COMES FROM (browsers cannot read the machine MAC):
 * - Optional: run a small local service that returns the machine MAC; set VITE_MAC_SERVICE_URL (e.g. http://localhost:8765).
 * - Or: Electron/desktop app reads the OS MAC and calls setClientMac(mac) so the web app has it in sessionStorage.
 */

const STORAGE_KEY = "client_mac";

const MAC_SERVICE_URL =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_MAC_SERVICE_URL
    ? String(import.meta.env.VITE_MAC_SERVICE_URL).replace(/\/$/, "")
    : "";

/** Normalize MAC: strip separators and lowercase for consistent comparison. */
export function normalizeMac(mac: string): string {
  return mac
    .replace(/[:.\-\s]/g, "")
    .toLowerCase()
    .trim();
}

export function getStoredMac(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function setClientMac(mac: string): void {
  const value = mac.trim();
  if (value) {
    sessionStorage.setItem(STORAGE_KEY, value);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

/** Fetch MAC from local service (e.g. http://localhost:8765/mac). Returns null on failure. */
async function fetchMacFromService(): Promise<string | null> {
  if (!MAC_SERVICE_URL) return null;
  try {
    const url = MAC_SERVICE_URL.includes("/mac") ? MAC_SERVICE_URL : `${MAC_SERVICE_URL}/mac`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const text = await res.text();
    const mac = (text || "").trim();
    return mac ? mac : null;
  } catch {
    return null;
  }
}

let fetchPromise: Promise<string | null> | null = null;

/**
 * Returns MAC for report requests: stored value, or one-time fetch from local service.
 * Call this when making report API requests; add header only when non-null.
 */
export async function getClientMacForRequest(): Promise<string | null> {
  const stored = getStoredMac();
  if (stored) return stored;
  if (!fetchPromise) {
    fetchPromise = fetchMacFromService();
  }
  const mac = await fetchPromise;
  if (mac) setClientMac(mac);
  return mac;
}

/**
 * User-friendly message for 403 from report endpoints when due to MAC restriction.
 * Returns null if not a MAC-related 403 so caller can use response.data.error.
 */
export function getReportAccessErrorMessage(err: {
  response?: { status?: number; data?: { error?: string } };
}): string | null {
  const status = err?.response?.status;
  const message = err?.response?.data?.error ?? "";
  if (status !== 403) return null;
  const lower = message.toLowerCase();
  if (
    lower.includes("mac") ||
    lower.includes("machine") ||
    lower.includes("device")
  ) {
    return (
      message ||
      "Report access is restricted to your registered device. Please use that device or contact your admin."
    );
  }
  return null;
}
