import type { Place, SearchRequest } from "./types";
import { cachedQueryOverpass } from "./overpass";
import { filterOpenNow } from "./oh_parser";
import type { InMemoryCache } from "./cache";

export interface SearchResult {
  places: Place[];
  originLabel: string;
}

export async function searchNearby(
  req: SearchRequest,
  cache: InMemoryCache,
  endpoint?: string,
): Promise<Place[]> {
  let places = await cachedQueryOverpass(req, cache, endpoint);

  places = places.slice(0, req.maxResults);

  if (req.openNow) {
    places = filterOpenNow(places);
  }

  return places;
}