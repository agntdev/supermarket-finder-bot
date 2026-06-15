import { Bot, Context, InlineKeyboard, Keyboard, type SessionFlavor, session } from "grammy";
import type { GeocodeResult, UserPrefs } from "./types";
import {
  DEFAULT_USER_PREFS,
  MAX_RESULTS_OPTIONS,
  RADIUS_OPTIONS,
} from "./types";
import {
  formatRadius,
  settingsKeyboard,
  settingsMessage,
} from "./settings";
import {
  buildSearchRequest,
} from "./prefs";
import {
  cachedQueryOverpass,
} from "./overpass";
import { InMemoryCache } from "./cache";
import {
  filterOpenNow,
} from "./oh_parser";
import {
  formatPlaceCard,
  noResultsMessage,
  placeKeyboard,
  postResultsKeyboard,
  formatInlineResults,
} from "./formatting";
import {
  cachedGeocodeAddress,
} from "./nominatim";

interface SessionData {
  prefs: UserPrefs;
  geocodeCandidates?: GeocodeResult[];
}

type BotContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<BotContext>(process.env.BOT_TOKEN || "");

const overpassCache = new InMemoryCache();

bot.use(
  session<SessionData, BotContext>({
    initial: (): SessionData => ({
      prefs: { ...DEFAULT_USER_PREFS },
    }),
  }),
);

bot.command("start", async (ctx) => {
  await ctx.reply(
    "Hi! I'll help you find nearby supermarkets.\n" +
      "\uD83D\uDC49 Tap \"Share Current Location\" to get started, or type an address.",
    {
      reply_markup: new Keyboard()
        .requestLocation("Share Current Location")
        .resized()
        .oneTime(),
    },
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "\uD83D\uDED2 Supermarket Finder Help\n" +
      "Use /start to begin or share your location.\n" +
      "Type an address to search for supermarkets there.\n" +
      "Inline mode: @botname [address] to get results in any chat.\n" +
      "Adjust settings with /settings or the \"Settings\" button.",
    {
      reply_markup: new InlineKeyboard().text(
        "Back to Main",
        "back:main",
      ),
    },
  );
});

bot.command("settings", async (ctx) => {
  const prefs = ctx.session.prefs;
  await ctx.reply(settingsMessage(prefs), {
    reply_markup: settingsKeyboard(prefs),
  });
});

bot.command("nearby", async (ctx) => {
  const prefs = ctx.session.prefs;
  if (!prefs.lastLocation) {
    await ctx.reply(
      "No prior location found. Please share your location first.",
      {
        reply_markup: new Keyboard()
          .requestLocation("Share Current Location")
          .resized()
          .oneTime(),
      },
    );
    return;
  }

  await ctx.reply("Searching...");

  try {
    const req = buildSearchRequest(prefs.lastLocation, prefs);
    let places = await cachedQueryOverpass(req, overpassCache);

    if (prefs.defaultOpenNow) {
      places = filterOpenNow(places);
    }

    if (places.length === 0) {
      await ctx.reply(
        noResultsMessage(req.radius, req.includeConvenience),
        {
          reply_markup: postResultsKeyboard(prefs),
        },
      );
      return;
    }

    for (const place of places) {
      await ctx.reply(formatPlaceCard(place), {
        parse_mode: "MarkdownV2",
        reply_markup: placeKeyboard(place),
      });
    }

    await ctx.reply(
      `Found ${places.length} supermarket${places.length !== 1 ? "s" : ""}.`,
      {
        reply_markup: postResultsKeyboard(prefs),
      },
    );
  } catch (err) {
    console.error("Nearby search error:", err);
    await ctx.reply(
      "Temporarily unable to fetch data. Please try again in a few minutes.",
    );
  }
});

bot.on("message:location", async (ctx) => {
  const location = ctx.message.location;
  ctx.session.prefs.lastLocation = {
    lat: location.latitude,
    lon: location.longitude,
  };

  await ctx.reply("Searching for nearby supermarkets...");

  try {
    const prefs = ctx.session.prefs;
    const req = buildSearchRequest(
      { lat: location.latitude, lon: location.longitude },
      prefs,
    );
    let places = await cachedQueryOverpass(req, overpassCache);

    if (prefs.defaultOpenNow) {
      places = filterOpenNow(places);
    }

    if (places.length === 0) {
      await ctx.reply(
        noResultsMessage(req.radius, req.includeConvenience),
        {
          reply_markup: postResultsKeyboard(prefs),
        },
      );
      return;
    }

    for (const place of places) {
      await ctx.reply(formatPlaceCard(place), {
        parse_mode: "MarkdownV2",
        reply_markup: placeKeyboard(place),
      });
    }

    await ctx.reply(
      `Found ${places.length} supermarket${places.length !== 1 ? "s" : ""}.`,
      {
        reply_markup: postResultsKeyboard(prefs),
      },
    );
  } catch (err) {
    console.error("Location search error:", err);
    await ctx.reply(
      "Temporarily unable to fetch data. Please try again in a few minutes.",
    );
  }
});

bot.on("message:text", async (ctx) => {
  const query = ctx.message.text.trim();
  if (!query) return;

  await ctx.reply("Looking up that address...");

  try {
    const candidates = await cachedGeocodeAddress(query, overpassCache);

    if (candidates.length === 0) {
      await ctx.reply(
        "Couldn't find that location. Try a more specific address.",
        {
          reply_markup: new Keyboard()
            .requestLocation("Share Current Location")
            .resized()
            .oneTime(),
        },
      );
      return;
    }

    if (candidates.length === 1) {
      const c = candidates[0];
      ctx.session.prefs.lastLocation = { lat: c.lat, lon: c.lon };
      ctx.session.geocodeCandidates = undefined;

      const prefs = ctx.session.prefs;
      const req = buildSearchRequest(
        { lat: c.lat, lon: c.lon },
        prefs,
      );
      let places = await cachedQueryOverpass(req, overpassCache);

      if (prefs.defaultOpenNow) {
        places = filterOpenNow(places);
      }

      if (places.length === 0) {
        await ctx.reply(
          noResultsMessage(req.radius, req.includeConvenience),
          {
            reply_markup: postResultsKeyboard(prefs),
          },
        );
        return;
      }

      for (const place of places) {
        await ctx.reply(formatPlaceCard(place), {
          parse_mode: "MarkdownV2",
          reply_markup: placeKeyboard(place),
        });
      }

      await ctx.reply(
        `Found ${places.length} supermarket${places.length !== 1 ? "s" : ""} near ${c.displayName.split(",")[0]}.`,
        {
          reply_markup: postResultsKeyboard(prefs),
        },
      );
      return;
    }

    ctx.session.geocodeCandidates = candidates;

    const lines = candidates.map(
      (c, i) => `${i + 1}. ${c.displayName}`,
    );

    const keyboard = new InlineKeyboard();
    for (let i = 0; i < candidates.length; i++) {
      keyboard.text(`Select ${i + 1}`, `geocode:${i}`);
      if ((i + 1) % 2 === 0 && i < candidates.length - 1) {
        keyboard.row();
      }
    }
    keyboard.row();
    keyboard.text("Cancel", "geocode:cancel");

    await ctx.reply(
      `I found multiple locations for "${query}". Please select one:\n\n${lines.join("\n")}`,
      { reply_markup: keyboard },
    );
  } catch (err) {
    console.error("Geocode error:", err);
    await ctx.reply(
      "Temporarily unable to look up addresses. Please try again or share your GPS location.",
      {
        reply_markup: new Keyboard()
          .requestLocation("Share Current Location")
          .resized()
          .oneTime(),
      },
    );
  }
});

bot.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query.trim();
  const prefs = ctx.session.prefs;
  let origin = prefs.lastLocation;

  if (query) {
    try {
      const candidates = await cachedGeocodeAddress(query, overpassCache);
      if (candidates.length > 0) {
        origin = { lat: candidates[0].lat, lon: candidates[0].lon };
      }
    } catch (err) {
      console.error("Inline geocode error:", err);
    }
  }

  if (!origin) {
    await ctx.answerInlineQuery(
      [
        {
          type: "article",
          id: "no_location",
          title: "Share your location first",
          description: "Open a chat with me and share your location to get started.",
          input_message_content: {
            message_text:
              "Share your location in a direct chat with me to enable inline supermarket search.",
          },
        },
      ],
      { cache_time: 60 },
    );
    return;
  }

  try {
    const req = buildSearchRequest(origin, prefs);
    let places = await cachedQueryOverpass(req, overpassCache);

    if (prefs.defaultOpenNow) {
      places = filterOpenNow(places);
    }

    const results = formatInlineResults(places, query);
    await ctx.answerInlineQuery(results, { cache_time: 60 });
  } catch (err) {
    console.error("Inline query error:", err);
    await ctx.answerInlineQuery(
      [
        {
          type: "article",
          id: "error",
          title: "Temporarily unavailable",
          description: "Please try again in a few minutes.",
          input_message_content: {
            message_text:
              "Supermarket search is temporarily unavailable. Please try again later.",
          },
        },
      ],
      { cache_time: 30 },
    );
  }
});

bot.callbackQuery(/^radius:(\d+)$/, async (ctx) => {
  const value = parseInt(ctx.match[1], 10);
  if (!RADIUS_OPTIONS.includes(value)) {
    await ctx.answerCallbackQuery({ text: "Invalid radius value." });
    return;
  }
  ctx.session.prefs.defaultRadius = value;
  await ctx.editMessageText(settingsMessage(ctx.session.prefs), {
    reply_markup: settingsKeyboard(ctx.session.prefs),
  });
  await ctx.answerCallbackQuery({
    text: `Radius set to ${formatRadius(value)}.`,
  });
});

bot.callbackQuery(/^results:(\d+)$/, async (ctx) => {
  const value = parseInt(ctx.match[1], 10);
  if (!MAX_RESULTS_OPTIONS.includes(value)) {
    await ctx.answerCallbackQuery({ text: "Invalid results value." });
    return;
  }
  ctx.session.prefs.defaultMaxResults = value;
  await ctx.editMessageText(settingsMessage(ctx.session.prefs), {
    reply_markup: settingsKeyboard(ctx.session.prefs),
  });
  await ctx.answerCallbackQuery({
    text: `Max results set to ${value}.`,
  });
});

bot.callbackQuery("conv:toggle", async (ctx) => {
  ctx.session.prefs.includeConvenience = !ctx.session.prefs.includeConvenience;
  await ctx.editMessageText(settingsMessage(ctx.session.prefs), {
    reply_markup: settingsKeyboard(ctx.session.prefs),
  });
  await ctx.answerCallbackQuery({
    text: `Convenience stores: ${ctx.session.prefs.includeConvenience ? "ON" : "OFF"}.`,
  });
});

bot.callbackQuery("opennow:toggle", async (ctx) => {
  ctx.session.prefs.defaultOpenNow = !ctx.session.prefs.defaultOpenNow;
  await ctx.editMessageText(settingsMessage(ctx.session.prefs), {
    reply_markup: settingsKeyboard(ctx.session.prefs),
  });
  await ctx.answerCallbackQuery({
    text: `Open now: ${ctx.session.prefs.defaultOpenNow ? "ON" : "OFF"}.`,
  });
});

bot.callbackQuery("back:results", async (ctx) => {
  await ctx.editMessageText(
    "No recent search results.\n\nShare your location to get started:",
    {
      reply_markup: new InlineKeyboard().text(
        "Start New Search",
        "back:main",
      ),
    },
  );
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("back:main", async (ctx) => {
  await ctx.editMessageText(
    "Hi! I'll help you find nearby supermarkets.\n" +
      "\uD83D\uDC49 Tap \"Share Current Location\" to get started, or type an address.",
  );
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("back:settings", async (ctx) => {
  const prefs = ctx.session.prefs;
  await ctx.editMessageText(settingsMessage(prefs), {
    reply_markup: settingsKeyboard(prefs),
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^geocode:(\d+)$/, async (ctx) => {
  const index = parseInt(ctx.match[1], 10);
  const candidates = ctx.session.geocodeCandidates;

  if (!candidates || index < 0 || index >= candidates.length) {
    await ctx.answerCallbackQuery({ text: "Selection expired. Please try again." });
    return;
  }

  const c = candidates[index];
  ctx.session.prefs.lastLocation = { lat: c.lat, lon: c.lon };
  ctx.session.geocodeCandidates = undefined;

  await ctx.editMessageText(
    `Selected: ${c.displayName}\n\nSearching for nearby supermarkets...`,
  );

  try {
    const prefs = ctx.session.prefs;
    const req = buildSearchRequest(
      { lat: c.lat, lon: c.lon },
      prefs,
    );
    let places = await cachedQueryOverpass(req, overpassCache);

    if (prefs.defaultOpenNow) {
      places = filterOpenNow(places);
    }

    if (places.length === 0) {
      await ctx.reply(
        noResultsMessage(req.radius, req.includeConvenience),
        {
          reply_markup: postResultsKeyboard(prefs),
        },
      );
      return;
    }

    for (const place of places) {
      await ctx.reply(formatPlaceCard(place), {
        parse_mode: "MarkdownV2",
        reply_markup: placeKeyboard(place),
      });
    }

    await ctx.reply(
      `Found ${places.length} supermarket${places.length !== 1 ? "s" : ""} near ${c.displayName.split(",")[0]}.`,
      {
        reply_markup: postResultsKeyboard(prefs),
      },
    );
  } catch (err) {
    console.error("Geocode search error:", err);
    await ctx.reply(
      "Temporarily unable to fetch data. Please try again in a few minutes.",
    );
  }

  await ctx.answerCallbackQuery();
});

bot.callbackQuery("geocode:cancel", async (ctx) => {
  ctx.session.geocodeCandidates = undefined;
  await ctx.editMessageText(
    "Search cancelled. Share your location or type another address to try again.",
    {
      reply_markup: new InlineKeyboard().text(
        "Main Menu",
        "back:main",
      ),
    },
  );
  await ctx.answerCallbackQuery();
});

bot.catch((err) => {
  console.error("Bot error:", err.error);
});

export { bot };
