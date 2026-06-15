import type { Coordinates, SearchRequest, UserPrefs } from "./types";
import {
  DEFAULT_USER_PREFS,
  MAX_RESULTS_OPTIONS,
  RADIUS_OPTIONS,
} from "./types";

export function resolveUserPrefs(
  stored: Partial<UserPrefs> | undefined,
): UserPrefs {
  return { ...DEFAULT_USER_PREFS, ...stored };
}

export function buildSearchRequest(
  origin: Coordinates,
  prefs?: Partial<UserPrefs>,
  overrides?: Partial<SearchRequest>,
): SearchRequest {
  const resolved = resolveUserPrefs(prefs);
  return {
    origin,
    radius: resolved.defaultRadius,
    maxResults: resolved.defaultMaxResults,
    includeConvenience: resolved.includeConvenience,
    openNow: resolved.defaultOpenNow,
    ...overrides,
  };
}

export function validateRadius(value: number): boolean {
  return RADIUS_OPTIONS.includes(value);
}

export function validateMaxResults(value: number): boolean {
  return MAX_RESULTS_OPTIONS.includes(value);
}

export function sanitizeRadius(value: number): number {
  return validateRadius(value) ? value : DEFAULT_USER_PREFS.defaultRadius;
}

export function sanitizeMaxResults(value: number): number {
  return validateMaxResults(value)
    ? value
    : DEFAULT_USER_PREFS.defaultMaxResults;
}
