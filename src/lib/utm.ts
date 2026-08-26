// Captures UTM params on entry, persists them for the whole session,
// and exposes them for GA4 + backend attribution.

import { API_URL } from "./apiBase";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const STORAGE_KEY = "niat_utm_params";
const HIT_PREFIX = "niat_utm_hit:";
const hitsInFlight = new Set<string>();

const TRACKED_PATHS = new Set(["/", "/nominate-student", "/nominate-teacher"]);

const trackedDestination = (pathname: string): string | undefined => {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/nominate") return "/nominate-student";
  return TRACKED_PATHS.has(path) ? path : undefined;
};

const safeGet = (storage: Storage): string | null => {
  try {
    return storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const safeSet = (storage: Storage, value: string): void => {
  try {
    storage.setItem(STORAGE_KEY, value);
  } catch {
    // private mode / blocked storage
  }
};

/**
 * Call once on app load. If the URL has UTM params, store them
 * (last-touch attribution — overwrites existing ones when new
 * UTM params are present in the URL).
 */
export function captureUtmParams(): void {
  const url = new URL(window.location.href);
  const found: UtmParams = {};

  UTM_KEYS.forEach((key) => {
    const value = url.searchParams.get(key);
    if (value) found[key] = value;
  });

  if (Object.keys(found).length > 0) {
    const serialized = JSON.stringify(found);
    safeSet(sessionStorage, serialized);

    if (typeof window.gtag === "function") {
      window.gtag("event", "utm_capture", found);
      window.gtag("set", "user_properties", found);
    }

    pingUtmHit(found);
  }
}

function pingUtmHit(params: UtmParams): void {
  const source = (params.utm_source || "").trim().toLowerCase();
  const medium = (params.utm_medium || "").trim().toLowerCase();
  const campaign = (params.utm_campaign || "").trim();
  if (!source || !medium || !campaign) return;

  const hitKey = `${HIT_PREFIX}${source}|${medium}|${campaign}`;
  try {
    if (sessionStorage.getItem(hitKey)) return;
  } catch {
    // continue and still attempt the hit
  }
  if (hitsInFlight.has(hitKey)) return;
  hitsInFlight.add(hitKey);

  const destination = trackedDestination(window.location.pathname);

  fetch(`${API_URL}/api/utm/hit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
      ...(destination ? { destination } : {}),
    }),
    keepalive: true,
  })
    .then((res) => {
      if (!res.ok) {
        hitsInFlight.delete(hitKey);
        return;
      }
      try {
        sessionStorage.setItem(hitKey, "1");
      } catch {
        // private mode
      }
    })
    .catch(() => {
      hitsInFlight.delete(hitKey);
    });
}

/** Get the currently stored UTM params for this browser session (last-touch). */
export function getUtmParams(): UtmParams {
  const raw = safeGet(sessionStorage);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UtmParams;
  } catch {
    return {};
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}
