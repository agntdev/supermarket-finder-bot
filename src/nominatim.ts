import type { Coordinates, GeocodeResult } from "./types";
import {
  NOMINATIM_ENDPOINT,
  NOMINATIM_TIMEOUT_MS,
  NOMINATIM_USER_AGENT,
} from "./types";
import type { InMemoryCache } from "./cache";
import { nominatimLimiter } from "./rate_limiter";
import { withRetry } from "./retry";

export class NominatimError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "NominatimError";
    this.code = code;
  }
}

export async function geocodeAddress(
  query: string,
  limit = 5,
  endpoint?: string,
): Promise<GeocodeResult[]> {
  return withRetry(async () => {
    await nominatimLimiter.acquire();

    const url = new URL("/search", endpoint || NOMINATIM_ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("addressdetails", "1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent": NOMINATIM_USER_AGENT,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new NominatimError(
          `Nominatim API returned ${res.status}: ${body.slice(0, 200)}`,
          res.status,
        );
      }

      const data = (await res.json()) as RawNominatimResult[];
      return data.map(parseNominatimResult).filter((r): r is GeocodeResult => r !== null);
    } finally {
      clearTimeout(timeout);
    }
  });
}

export async function reverseGeocode(
  coords: Coordinates,
  endpoint?: string,
): Promise<string | null> {
  return withRetry(async () => {
    await nominatimLimiter.acquire();

    const url = new URL("/reverse", endpoint || NOMINATIM_ENDPOINT);
    url.searchParams.set("lat", String(coords.lat));
    url.searchParams.set("lon", String(coords.lon));
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "18");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent": NOMINATIM_USER_AGENT,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new NominatimError(
          `Nominatim reverse API returned ${res.status}: ${body.slice(0, 200)}`,
          res.status,
        );
      }

      const data = (await res.json()) as RawNominatimReverseResult;
      return data.display_name ?? null;
    } finally {
      clearTimeout(timeout);
    }
  });
}

interface RawNominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  osm_type: string;
  osm_id: number;
}

interface RawNominatimReverseResult {
  display_name?: string;
}

function parseNominatimResult(raw: RawNominatimResult): GeocodeResult | null {
  const lat = parseFloat(raw.lat);
  const lon = parseFloat(raw.lon);
  if (isNaN(lat) || isNaN(lon)) return null;

  return {
    displayName: raw.display_name,
    lat,
    lon,
    type: raw.type,
    osmType: raw.osm_type,
    osmId: raw.osm_id,
  };
}

export const NOMINATIM_CACHE_TTL_MS = 30 * 60 * 1000;

export function buildNominatimCacheKey(query: string): string {
  return ["nominatim", query.toLowerCase().trim()].join(":");
}

export async function cachedGeocodeAddress(
  query: string,
  cache: InMemoryCache,
  limit?: number,
  endpoint?: string,
): Promise<GeocodeResult[]> {
  const key = buildNominatimCacheKey(query);
  const cached = cache.get<GeocodeResult[]>(key);
  if (cached) return cached;

  const results = await geocodeAddress(query, limit, endpoint);
  cache.set(key, results, NOMINATIM_CACHE_TTL_MS);
  return results;
}
