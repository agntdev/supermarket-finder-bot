import type { Coordinates } from "./types";

export const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org";
export const NOMINATIM_TIMEOUT_MS = 10_000;
const USER_AGENT = "SupermarketFinderBot/1.0 (Telegram bot; contact@example.com)";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  category: string;
  type: string;
  importance: number;
}

let lastRequestTime = 0;

function enforceRateLimit(): void {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1000) {
    const wait = 1000 - elapsed;
    const start = Date.now();
    while (Date.now() - start < wait) {
    }
  }
}

export class NominatimError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "NominatimError";
    this.code = code;
  }
}

export async function geocode(
  query: string,
  endpoint?: string,
): Promise<Coordinates | null> {
  const base = endpoint || NOMINATIM_ENDPOINT;
  const url = `${base}/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1`;

  enforceRateLimit();
  lastRequestTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new NominatimError(
        `Nominatim search returned ${res.status}`,
        res.status,
      );
    }

    const results = (await res.json()) as NominatimResult[];
    if (!results.length) return null;

    const best = results[0];
    return {
      lat: parseFloat(best.lat),
      lon: parseFloat(best.lon),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function reverseGeocode(
  coords: Coordinates,
  endpoint?: string,
): Promise<string | null> {
  const base = endpoint || NOMINATIM_ENDPOINT;
  const url = `${base}/reverse?lat=${coords.lat}&lon=${coords.lon}&format=jsonv2`;

  enforceRateLimit();
  lastRequestTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new NominatimError(
        `Nominatim reverse returned ${res.status}`,
        res.status,
      );
    }

    const result = (await res.json()) as NominatimResult | { error: string };
    if ("error" in result) return null;

    return result.display_name;
  } finally {
    clearTimeout(timeout);
  }
}
