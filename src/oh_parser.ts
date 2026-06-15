import { opening_hours } from "opening_hours";
import type { Place } from "./types";

export function isOpenNow(openingHours: string | null, date?: Date): boolean {
  if (!openingHours) return false;
  try {
    const oh = new opening_hours(openingHours);
    return oh.getState(date);
  } catch {
    return false;
  }
}

export function isOpenUnknown(openingHours: string | null, date?: Date): boolean {
  if (!openingHours) return true;
  try {
    const oh = new opening_hours(openingHours);
    return oh.getUnknown(date);
  } catch {
    return true;
  }
}

export function getOpenStatus(
  openingHours: string | null,
  date?: Date,
): "open" | "closed" | "unknown" {
  if (!openingHours) return "unknown";
  try {
    const oh = new opening_hours(openingHours);
    const str = oh.getStateString(date, true);
    if (str === "open") return "open";
    if (str === "closed") return "closed";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function filterOpenNow(places: Place[]): Place[] {
  return places.filter((p) => isOpenNow(p.openingHours));
}
