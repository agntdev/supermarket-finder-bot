import { InlineKeyboard, Keyboard } from "grammy";
import type { Coordinates, GeocodeResult } from "./types";
import { reverseGeocode } from "./nominatim";

export function locationRequestKeyboard(): Keyboard {
  return new Keyboard()
    .requestLocation("Share Current Location")
    .resized()
    .oneTime();
}

export async function resolveLocationLabel(
  coords: Coordinates,
): Promise<string> {
  const label = await reverseGeocode(coords);
  if (label) return label;
  return `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;
}

export function buildGeocodeCandidatesMessage(
  query: string,
  candidates: GeocodeResult[],
): string {
  const lines = candidates.map((c, i) => `${i + 1}. ${c.displayName}`);
  return `I found multiple locations for "${query}". Please select one:\n\n${lines.join("\n")}`;
}

export function buildGeocodeCandidatesKeyboard(
  candidates: GeocodeResult[],
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (let i = 0; i < candidates.length; i++) {
    keyboard.text(`Select ${i + 1}`, `geocode:${i}`);
    if ((i + 1) % 2 === 0 && i < candidates.length - 1) {
      keyboard.row();
    }
  }
  keyboard.row();
  keyboard.text("Cancel", "geocode:cancel");
  return keyboard;
}
