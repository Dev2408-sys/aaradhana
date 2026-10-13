import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import {
  parseWhatsappNumbers,
  WHATSAPP_BULK_LIMIT,
} from '../utils/whatsapp-phones';

const SEND_GAP_MS = 280;
/** Meta sample sender. API says "sent" only for numbers on the test allowlist. */
const TEST_PHONE_ID = '1222441257625130';
/** Khodi Mart live line: +91 79843 37747 */
const LIVE_PHONE_ID = '1245317021999582';
const LIVE_PHONE_DISPLAY = '+91 79843 37747';

function resolvePhoneId(raw: string) {
  const phoneId = raw.trim();
  if (!phoneId || phoneId === TEST_PHONE_ID) return LIVE_PHONE_ID;
  return phoneId;
}

export type BulkSendResult = {
  to: string;
  ok: boolean;
  messageId?: string;
  error?: string;
  code?: number;
};

function devMode() {
  return ['1', 'true', 'yes', 'on'].includes(env.WHATSAPP_DEV_MODE.trim().toLowerCase());
}

export function whatsappStatus() {
  const token = env.WHATSAPP_API_TOKEN.trim();
  const configuredId = env.WHATSAPP_PHONE_ID.trim();
  const phoneId = resolvePhoneId(configuredId);
  return {
    configured: Boolean(token && phoneId),
    apiUrl: env.WHATSAPP_API_URL.replace(/\/$/, ''),
    phoneIdLast4: phoneId.slice(-4),
    fromDisplay: phoneId === LIVE_PHONE_ID ? LIVE_PHONE_DISPLAY : `…${phoneId.slice(-4)}`,
    usingTestNumber: phoneId === TEST_PHONE_ID,
    devMode: devMode(),
    maxNumbers: WHATSAPP_BULK_LIMIT,
  };
}

function graphErrorMessage(body: unknown): { message: string; code?: number } {
  const err = (body as { error?: { message?: string; code?: number } } | null)?.error;
  const code = err?.code;
  const raw = err?.message ?? 'WhatsApp API rejected the message';
  const hints: Record<number, string> = {
    190: 'Access token invalid. Update WHATSAPP_API_TOKEN.',
    131030:
      'This sender is still the Meta test number. Real customers are not on the allowlist.',
    131047: '24-hour window closed. Use an approved template with an image header.',
    131026: 'Number is not on WhatsApp or cannot be delivered.',
    132001: 'Template name or language does not match an approved template.',
    132000: 'Template variables do not match the approved template.',
    132015: 'Template is paused.',
    130429: 'Rate limit. Wait and send a smaller batch.',
  };
  return { message: code && hints[code] ? `${hints[code]} (${raw})` : raw, code };
}

async function graphFetch(url: string, init: RequestInit) {
  const token = env.WHATSAPP_API_TOKEN.trim();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { error: { message: text.slice(0, 300) } };
  }
  return { ok: res.ok, status: res.status, json };
}

async function uploadMedia(filePath: string, mime: string) {
  const { apiUrl } = whatsappStatus();
  const phoneId = resolvePhoneId(env.WHATSAPP_PHONE_ID);
  const bytes = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mime);
  form.append(
    'file',
    new Blob([new Uint8Array(bytes)], { type: mime }),
    path.basename(filePath),
  );

  const res = await graphFetch(`${apiUrl}/${phoneId}/media`, { method: 'POST', body: form });
  const id = (res.json as { id?: string } | null)?.id;
  if (!res.ok || !id) {
    const parsed = graphErrorMessage(res.json);
    throw new AppError(parsed.message, 502, 'WHATSAPP_MEDIA');
  }
  return id;
}

async function sendOne(payload: Record<string, unknown>, to: string): Promise<BulkSendResult> {
  const { apiUrl } = whatsappStatus();
  const phoneId = resolvePhoneId(env.WHATSAPP_PHONE_ID);
  const res = await graphFetch(`${apiUrl}/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const messageId = (res.json as { messages?: { id?: string }[] } | null)?.messages?.[0]?.id;
  if (!res.ok || !messageId) {
    const parsed = graphErrorMessage(res.json);
    return { to, ok: false, error: parsed.message, code: parsed.code };
  }
  return { to, ok: true, messageId };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendBulkPassEnquiry(input: {
  numbersRaw: string;
  message: string;
  imagePath: string;
  imageMime: string;
}) {
  const status = whatsappStatus();
  if (!status.configured) {
    throw new AppError(
      'WhatsApp is not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_ID on the server.',
      503,
      'WHATSAPP_NOT_CONFIGURED',
    );
  }

  const parsed = parseWhatsappNumbers(input.numbersRaw);
  if (parsed.numbers.length === 0) {
    throw new AppError('No valid Indian mobile numbers found', 400, 'NO_NUMBERS');
  }
  if (parsed.numbers.length > WHATSAPP_BULK_LIMIT) {
    throw new AppError(
      `Maximum ${WHATSAPP_BULK_LIMIT} numbers per send. Split the list.`,
      400,
      'TOO_MANY_NUMBERS',
    );
  }

  const caption = input.message.trim();
  if (!caption) {
    throw new AppError('Message is required', 400, 'MESSAGE_REQUIRED');
  }
  if (caption.length > 1024) {
    throw new AppError('Message must be 1024 characters or less', 400, 'MESSAGE_TOO_LONG');
  }

  if (devMode()) {
    logger.info({ count: parsed.numbers.length }, 'whatsapp bulk skipped (WHATSAPP_DEV_MODE)');
    return {
      sent: parsed.numbers.length,
      failed: 0,
      invalid: parsed.invalid,
      duplicatesSkipped: parsed.duplicates,
      devMode: true,
      results: parsed.numbers.map((to) => ({ to, ok: true, messageId: 'dev-mode' })),
    };
  }

  const mediaId = await uploadMedia(input.imagePath, input.imageMime);
  const results: BulkSendResult[] = [];
  for (let i = 0; i < parsed.numbers.length; i += 1) {
    const to = parsed.numbers[i];
    try {
      results.push(await sendOne(imagePayload(to, mediaId, caption), to));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Send failed';
      results.push({ to, ok: false, error: message });
    }
    if (i < parsed.numbers.length - 1) await sleep(SEND_GAP_MS);
  }

  const sent = results.filter((r) => r.ok).length;
  logger.info({ sent, failed: results.length - sent }, 'whatsapp bulk send finished');

  return {
    sent,
    failed: results.length - sent,
    invalid: parsed.invalid,
    duplicatesSkipped: parsed.duplicates,
    devMode: false,
    results,
  };
}

function imagePayload(to: string, mediaId: string, caption: string) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: { id: mediaId, caption },
  };
}
