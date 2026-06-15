import { InlineKeyboard } from "grammy";
import type { InlineQueryResult } from "@grammyjs/types/inline";
import type { Place } from "./types";
import { RADIUS_OPTIONS } from "./types";

export function formatPlaceCard(place: Place): string {
  const distStr = place.distance >= 1000
    ? `${(place.distance / 1000).toFixed(1)}km`
    : `${place.distance}m`;
  const status = placeOpeningStatus(place);

  return [
    `**${escapeMarkdown(place.name)}**`,
    `${distStr} away • ${status}`,
    place.address,
    place.openingHours ? `Hours: ${place.openingHours}` : "",
    `[View on OSM](${place.osmUrl})`,
  ].filter(Boolean).join("\n");
}

function placeOpeningStatus(place: Place): string {
  if (!place.openingHours) return "\u2753";
  return "\uD83D\uDFE2";
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/~/g, "\\~")
    .replace(/`/g, "\\`")
    .replace(/>/g, "\\>")
    .replace(/#/g, "\\#")
    .replace(/\+/g, "\\+")
    .replace(/-/g, "\\-")
    .replace(/=/g, "\\=")
    .replace(/\|/g, "\\|")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\./g, "\\.")
    .replace(/!/g, "\\!");
}

export function placeKeyboard(place: Place): InlineKeyboard {
  return new InlineKeyboard()
    .url("Open in OSM", place.osmUrl)
    .url(
      "Directions",
      `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`,
    )
    .switchInline("Share", `${place.name} — ${place.address}`);
}

export function postResultsKeyboard(
  prefs: { defaultRadius: number; defaultMaxResults: number; includeConvenience: boolean; defaultOpenNow: boolean },
): InlineKeyboard {
  const currentRadiusIdx = RADIUS_OPTIONS.indexOf(prefs.defaultRadius);
  const canIncrease = currentRadiusIdx < RADIUS_OPTIONS.length - 1;
  const canDecrease = currentRadiusIdx > 0;

  const openNowLabel = prefs.defaultOpenNow
    ? "Open Now: ON"
    : "Open Now: OFF";

  const keyboard = new InlineKeyboard();

  if (canIncrease) {
    keyboard.text("+ Radius", "results:radius_up");
  }
  if (canDecrease) {
    keyboard.text("\u2212 Radius", "results:radius_down");
  }
  keyboard.text(openNowLabel, "opennow:toggle").row();

  keyboard.text("Settings", "back:settings")
    .text("Back to Main", "back:main");

  return keyboard;
}

export function noResultsKeyboard(
  prefs: { defaultRadius: number; defaultMaxResults: number; includeConvenience: boolean; defaultOpenNow: boolean },
): InlineKeyboard {
  const currentRadiusIdx = RADIUS_OPTIONS.indexOf(prefs.defaultRadius);
  const canIncrease = currentRadiusIdx < RADIUS_OPTIONS.length - 1;

  const keyboard = new InlineKeyboard();

  if (canIncrease) {
    keyboard.text("Try Larger Radius", "results:radius_up");
  }
  if (!prefs.includeConvenience) {
    keyboard.text("Include Convenience", "conv:toggle");
  }
  keyboard.row();
  keyboard.text("Settings", "back:settings")
    .text("Back to Main", "back:main");

  return keyboard;
}

export function noResultsMessage(radius: number, includeConvenience: boolean): string {
  const distStr = radius >= 1000 ? `${radius / 1000}km` : `${radius}m`;
  let msg = `No supermarkets found within ${distStr}. Try:\n`;
  msg += "\u2022 Increasing the search radius\n";
  if (!includeConvenience) {
    msg += "\u2022 Including convenience stores\n";
  }
  msg += "\u2022 Verifying your location";
  return msg;
}

export function resultsSummary(places: Place[], locationName?: string): string {
  const count = places.length;
  const loc = locationName ? ` near ${locationName.split(",")[0]}` : "";
  return `Found ${count} supermarket${count !== 1 ? "s" : ""}${loc}.`;
}

export function formatInlineResults(
  places: Place[],
  query: string,
): InlineQueryResult[] {
  const results: InlineQueryResult[] = [];

  for (let i = 0; i < places.length && results.length < 50; i++) {
    const place = places[i];
    const distStr = place.distance >= 1000
      ? `${(place.distance / 1000).toFixed(1)}km`
      : `${place.distance}m`;

    results.push({
      type: "article",
      id: `place_${place.osmId}`,
      title: place.name,
      description: `${distStr} away — ${place.address}`,
      url: place.osmUrl,
      input_message_content: {
        message_text: formatPlaceCard(place),
        parse_mode: "MarkdownV2",
      },
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Open in OSM", url: place.osmUrl },
            {
              text: "Directions",
              url: `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`,
            },
          ],
        ],
      },
    });
  }

  if (query && results.length === 0) {
    results.push({
      type: "article",
      id: "no_results",
      title: "No supermarkets found",
      description: `No results for "${query}". Try a different location.`,
      input_message_content: {
        message_text: `No supermarkets found near "${query}". Try a different location or a more specific address.`,
      },
    });
  }

  return results;
}