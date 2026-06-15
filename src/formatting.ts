import { InlineKeyboard } from "grammy";
import type { InlineQueryResult } from "@grammyjs/types/inline";
import type { Place } from "./types";

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
  prefs: { includeConvenience: boolean; defaultOpenNow: boolean },
): InlineKeyboard {
  const openNowLabel = prefs.defaultOpenNow
    ? "Open Now: ON"
    : "Open Now: OFF";
  return new InlineKeyboard()
    .text("Settings", "back:settings")
    .text(openNowLabel, "opennow:toggle")
    .row()
    .text("Back to Main", "back:main");
}

export function noResultsMessage(radius: number, includeConvenience: boolean): string {
  const distStr = radius >= 1000 ? `${radius / 1000}km` : `${radius}m`;
  let msg = `No supermarkets found within ${distStr}. Try:\n`;
  msg += "- Increasing the search radius\n";
  if (!includeConvenience) {
    msg += "- Including convenience stores\n";
  }
  msg += "- Verifying your location";
  return msg;
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