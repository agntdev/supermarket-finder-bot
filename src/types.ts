export interface Coordinates {
  lat: number;
  lon: number;
}

export interface SearchRequest {
  origin: Coordinates;
  radius: number;
  maxResults: number;
  includeConvenience: boolean;
  openNow: boolean;
}

export interface Place {
  osmId: number;
  name: string;
  lat: number;
  lon: number;
  distance: number;
  address: string;
  openingHours: string | null;
  osmUrl: string;
  tags: Record<string, string>;
  type: "supermarket" | "convenience" | "marketplace";
}

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OverpassElement[];
}



export const DEFAULT_RADIUS = 1000;
export const DEFAULT_MAX_RESULTS = 5;
export const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
export const OVERPASS_TIMEOUT_MS = 30_000;

export const SUPERMARKET_TAGS = ["shop=supermarket"];
export const CONVENIENCE_TAGS = ["shop=convenience"];
export const MARKETPLACE_TAGS = ["amenity=marketplace"];
