export interface NominatimConfig {
  baseUrl: string;
  userAgent: string;
  rateLimitMs: number;
}

export interface NominatimCoordinates {
  lat: number;
  lon: number;
}

export interface NominatimBoundingBox extends NominatimCoordinates {
  lat2: number;
  lon2: number;
}

export interface NominatimResult {
  placeId: number;
  licence: string;
  osmType: string;
  osmId: number;
  lat: string;
  lon: string;
  displayName: string;
  address: Record<string, string>;
  boundingbox: [string, string, string, string];
  importance: number;
  type: string;
  class: string;
}

export interface NominatimSearchParams {
  q: string;
  limit?: number;
  viewbox?: string;
  bounded?: 0 | 1;
  countrycodes?: string;
}

export interface NominatimReverseParams {
  lat: number;
  lon: number;
  zoom?: number;
}

export class NominatimError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "NominatimError";
  }
}

export class NominatimRateLimitError extends NominatimError {
  constructor() {
    super("Rate limit exceeded. Please wait before retrying.", 429);
    this.name = "NominatimRateLimitError";
  }
}

function bboxToString(b: NominatimBoundingBox): string {
  return [b.lon, b.lat, b.lon2, b.lat2].join(",");
}

export function createNominatimClient(config: NominatimConfig) {
  const normalizedBaseUrl = config.baseUrl.replace(/\/$/, "");
  let lastRequestTime = 0;

  async function request<T>(path: string): Promise<T> {
    const now = Date.now();
    const waitMs = config.rateLimitMs - (now - lastRequestTime);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    lastRequestTime = Date.now();

    const url = `${normalizedBaseUrl}/${path}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": config.userAgent,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new NominatimRateLimitError();
      }
      throw new NominatimError(
        `Nominatim API returned ${response.status}: ${response.statusText}`,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  function coordinates(result: NominatimResult): NominatimCoordinates {
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    };
  }

  async function search(params: NominatimSearchParams): Promise<NominatimResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("q", params.q);
    searchParams.set("format", "jsonv2");
    searchParams.set("limit", String(params.limit ?? 5));
    if (params.viewbox) searchParams.set("viewbox", params.viewbox);
    if (params.bounded !== undefined) searchParams.set("bounded", String(params.bounded));
    if (params.countrycodes) searchParams.set("countrycodes", params.countrycodes);

    return request<NominatimResult[]>(`search?${searchParams.toString()}`);
  }

  async function reverse(params: NominatimReverseParams): Promise<NominatimResult | null> {
    const searchParams = new URLSearchParams();
    searchParams.set("lat", String(params.lat));
    searchParams.set("lon", String(params.lon));
    searchParams.set("format", "jsonv2");
    if (params.zoom !== undefined) searchParams.set("zoom", String(params.zoom));

    const result = await request<NominatimResult | { error: string }>(
      `reverse?${searchParams.toString()}`,
    );
    if ("error" in result) return null;
    return result;
  }

  async function geocode(query: string, limit?: number): Promise<NominatimResult[]> {
    return search({ q: query, limit });
  }

  async function geocodeInViewbox(
    query: string,
    viewbox: NominatimBoundingBox,
    bounded?: boolean,
    limit?: number,
  ): Promise<NominatimResult[]> {
    return search({
      q: query,
      viewbox: bboxToString(viewbox),
      bounded: bounded ? 1 : 0,
      limit,
    });
  }

  async function reverseGeocode(
    lat: number,
    lon: number,
    zoom?: number,
  ): Promise<NominatimResult | null> {
    return reverse({ lat, lon, zoom });
  }

  return {
    search,
    reverse,
    geocode,
    geocodeInViewbox,
    reverseGeocode,
    coordinates,
  };
}

export type NominatimClient = ReturnType<typeof createNominatimClient>;
