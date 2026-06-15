import type {
  Coordinates,
  OverpassElement,
  OverpassResponse,
  Place,
  SearchRequest,
} from "./types";
import {
  CONVENIENCE_TAGS,
  DEFAULT_MAX_RESULTS,
  DEFAULT_RADIUS,
  MARKETPLACE_TAGS,
  OVERPASS_ENDPOINT,
  OVERPASS_TIMEOUT_MS,
  SUPERMARKET_TAGS,
} from "./types";
import type { InMemoryCache } from "./cache";

const EARTH_RADIUS_M = 6_371_000;

function haversineDistance(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return EARTH_RADIUS_M * c;
}

function buildOverpassQuery(req: SearchRequest): string {
  const { origin, radius, maxResults, includeConvenience } = req;
  const limit = maxResults || DEFAULT_MAX_RESULTS;
  const r = radius || DEFAULT_RADIUS;
  const tags: string[] = [];

  for (const t of SUPERMARKET_TAGS) {
    const [k, v] = t.split("=");
    tags.push(`nwr["${k}"="${v}"](around:${r},${origin.lat},${origin.lon})`);
  }

  if (includeConvenience) {
    for (const t of CONVENIENCE_TAGS) {
      const [k, v] = t.split("=");
      tags.push(`nwr["${k}"="${v}"](around:${r},${origin.lat},${origin.lon})`);
    }
    for (const t of MARKETPLACE_TAGS) {
      const [k, v] = t.split("=");
      tags.push(`nwr["${k}"="${v}"](around:${r},${origin.lat},${origin.lon})`);
    }
  }

  const timeout = Math.min(Math.ceil(r / 500) * 5, OVERPASS_TIMEOUT_MS / 1000);
  const body = tags.length > 1 ? `(\n  ${tags.join(";\n  ")};\n)` : tags[0];

  return `[out:json][timeout:${timeout}];\n${body};\nout body center ${limit};`;
}

function getElementCoords(el: OverpassElement): Coordinates | null {
  if (el.lat !== undefined && el.lon !== undefined) {
    return { lat: el.lat, lon: el.lon };
  }
  if (el.center) {
    return { lat: el.center.lat, lon: el.center.lon };
  }
  return null;
}

function classifyElement(el: OverpassElement): Place["type"] {
  const tags = el.tags ?? {};
  if (tags["shop"] === "convenience") return "convenience";
  if (tags["amenity"] === "marketplace") return "marketplace";
  if (tags["shop"] === "supermarket") return "supermarket";
  return "supermarket";
}

function buildOsmUrl(el: OverpassElement): string {
  const typeMap: Record<string, string> = {
    node: "node",
    way: "way",
    relation: "relation",
  };
  const osmType = typeMap[el.type] || "node";
  return `https://www.openstreetmap.org/${osmType}/${el.id}`;
}

function buildAddress(el: OverpassElement): string {
  const t = el.tags ?? {};
  const parts: string[] = [];
  if (t["addr:street"]) {
    const hn = t["addr:housenumber"];
    parts.push(hn ? `${hn} ${t["addr:street"]}` : t["addr:street"]);
  }
  if (t["addr:city"]) parts.push(t["addr:city"]);
  else if (t["addr:suburb"]) parts.push(t["addr:suburb"]);
  if (t["addr:postcode"]) parts.push(t["addr:postcode"]);
  if (t["addr:country"]) parts.push(t["addr:country"]);
  return parts.join(", ") || "Address not available";
}

function elementToPlace(
  el: OverpassElement,
  origin: Coordinates,
): Place | null {
  const coords = getElementCoords(el);
  if (!coords) return null;

  const tags = el.tags ?? {};
  const name = tags.name ?? tags["brand"] ?? "Unnamed";

  return {
    osmId: el.id,
    name,
    lat: coords.lat,
    lon: coords.lon,
    distance: Math.round(haversineDistance(origin, coords)),
    address: buildAddress(el),
    openingHours: tags["opening_hours"] ?? null,
    osmUrl: buildOsmUrl(el),
    tags,
    type: classifyElement(el),
  };
}

export function parseOverpassResponse(
  data: OverpassResponse,
  origin: Coordinates,
): Place[] {
  const places: Place[] = [];
  for (const el of data.elements) {
    const place = elementToPlace(el, origin);
    if (place) places.push(place);
  }
  places.sort((a, b) => a.distance - b.distance);
  return places;
}

export class OverpassError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "OverpassError";
    this.code = code;
  }
}

export async function queryOverpass(
  req: SearchRequest,
  endpoint?: string,
): Promise<Place[]> {
  const query = buildOverpassQuery(req);
  const url = endpoint || OVERPASS_ENDPOINT;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "User-Agent":
          "SupermarketFinderBot/1.0 (Telegram bot; contact@example.com)",
      },
      body: new URLSearchParams({ data: query }).toString(),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new OverpassError(
        `Overpass API returned ${res.status}: ${body.slice(0, 200)}`,
        res.status,
      );
    }

    const data = (await res.json()) as OverpassResponse;
    return parseOverpassResponse(data, req.origin);
  } finally {
    clearTimeout(timeout);
  }
}

export function defaultSearchRequest(
  origin: Coordinates,
  overrides?: Partial<SearchRequest>,
): SearchRequest {
  return {
    origin,
    radius: DEFAULT_RADIUS,
    maxResults: DEFAULT_MAX_RESULTS,
    includeConvenience: false,
    openNow: false,
    ...overrides,
  };
}

export const OVERPASS_CACHE_TTL_MS = 60 * 60 * 1000;

export function buildOverpassCacheKey(req: SearchRequest): string {
  return [
    "overpass",
    req.origin.lat.toFixed(4),
    req.origin.lon.toFixed(4),
    req.radius,
    req.maxResults,
    req.includeConvenience ? "1" : "0",
  ].join(":");
}

export async function cachedQueryOverpass(
  req: SearchRequest,
  cache: InMemoryCache,
  endpoint?: string,
): Promise<Place[]> {
  const key = buildOverpassCacheKey(req);
  const cached = cache.get<Place[]>(key);
  if (cached) return cached;

  const places = await queryOverpass(req, endpoint);
  cache.set(key, places, OVERPASS_CACHE_TTL_MS);
  return places;
}
