import type { Api } from "grammy";

let adminApi: Api | null = null;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

export function setAdminApi(api: Api): void {
  adminApi = api;
}

async function sendAlert(message: string): Promise<void> {
  if (!ADMIN_CHAT_ID || !adminApi) return;
  try {
    await adminApi.sendMessage(ADMIN_CHAT_ID, message);
  } catch (err) {
    console.error("Failed to send admin alert:", err);
  }
}

export async function alertCriticalError(
  error: unknown,
  source: string,
  chatId?: number,
  username?: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const errorStr = error instanceof Error ? error.message : String(error);
  let message = `🚨 Critical Error\nSource: ${source}\nTime: ${timestamp}\nError: ${errorStr}`;
  if (chatId) message += `\nChat ID: ${chatId}`;
  if (username) message += `\nUser: @${username}`;
  await sendAlert(message);
}

export async function alertQuotaWarning(
  service: string,
  details?: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  let message = `⚠️ Quota Warning\nService: ${service}\nTime: ${timestamp}`;
  if (details) message += `\n${details}`;
  await sendAlert(message);
}