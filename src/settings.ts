import { InlineKeyboard } from "grammy";
import type { UserPrefs } from "./types";
import { DEFAULT_USER_PREFS, MAX_RESULTS_OPTIONS, RADIUS_OPTIONS } from "./types";

export function formatRadius(meters: number): string {
  if (meters >= 1000) return `${meters / 1000}km`;
  return `${meters}m`;
}

export function settingsMessage(prefs: UserPrefs): string {
  const radius = formatRadius(prefs.defaultRadius);
  return [
    "Preferences:",
    `- Radius: ${radius}`,
    `- Max results: ${prefs.defaultMaxResults}`,
    `- Include convenience stores: ${prefs.includeConvenience ? "yes" : "no"}`,
    `- Open now only: ${prefs.defaultOpenNow ? "yes" : "no"}`,
  ].join("\n");
}

export function settingsKeyboard(prefs: UserPrefs): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  for (const r of RADIUS_OPTIONS) {
    const label = prefs.defaultRadius === r
      ? `✅ Radius: ${formatRadius(r)}`
      : `Radius: ${formatRadius(r)}`;
    keyboard.text(label, `radius:${r}`);
  }
  keyboard.row();

  for (const n of MAX_RESULTS_OPTIONS) {
    const label = prefs.defaultMaxResults === n
      ? `✅ Results: ${n}`
      : `Results: ${n}`;
    keyboard.text(label, `results:${n}`);
  }
  keyboard.row();

  const convLabel = prefs.includeConvenience
    ? "Include Convenience: ON"
    : "Include Convenience: OFF";
  keyboard.text(convLabel, "conv:toggle").row();

  const openNowLabel = prefs.defaultOpenNow
    ? "Open Now: ON"
    : "Open Now: OFF";
  keyboard.text(openNowLabel, "opennow:toggle").row();

  keyboard.text("← Back to Results", "back:results");

  return keyboard;
}

export function togglePreference<K extends keyof UserPrefs>(
  prefs: UserPrefs,
  key: K,
): UserPrefs {
  if (typeof prefs[key] === "boolean") {
    return { ...prefs, [key]: !prefs[key] };
  }
  return prefs;
}