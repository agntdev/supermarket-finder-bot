import { Bot, Context, InlineKeyboard, Keyboard, type SessionFlavor, session } from "grammy";
import type { UserPrefs } from "./types";
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

interface SessionData {
  prefs: UserPrefs;
}

type BotContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<BotContext>(process.env.BOT_TOKEN || "");

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

bot.catch((err) => {
  console.error("Bot error:", err.error);
});

export { bot };
