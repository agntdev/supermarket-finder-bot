import { GrammyError } from "grammy";

const PERMISSION_ERROR_PATTERNS = [
  "bot was blocked by the user",
  "bot was kicked from",
  "bot is not a member of",
  "user is deactivated",
  "chat not found",
  "group chat was deactivated",
  "forbidden:",
  "have no rights to",
  "can't send messages",
  "need administrator rights",
  "not enough rights",
];

export function isPermissionError(err: unknown): boolean {
  if (!(err instanceof GrammyError)) return false;
  if (err.error_code === 403 || err.error_code === 400) {
    const desc = err.description.toLowerCase();
    for (const pattern of PERMISSION_ERROR_PATTERNS) {
      if (desc.includes(pattern)) return true;
    }
  }
  return false;
}

export function isFloodError(err: unknown): boolean {
  if (!(err instanceof GrammyError)) return false;
  return err.error_code === 420;
}

export function getRetryAfterSeconds(err: unknown): number | undefined {
  if (!(err instanceof GrammyError)) return undefined;
  if (err.error_code === 420 && err.parameters?.retry_after) {
    return err.parameters.retry_after;
  }
  return undefined;
}

export function isRetryableTelegramError(err: unknown): boolean {
  if (!(err instanceof GrammyError)) return false;
  if (isFloodError(err)) return true;
  if (err.error_code >= 500 && err.error_code < 600) return true;
  return false;
}
