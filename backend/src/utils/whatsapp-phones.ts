const MAX_NUMBERS = 150;

export type ParsedPhones = {
  numbers: string[];
  invalid: string[];
  duplicates: number;
};

/** Indian mobiles → WhatsApp `to` (91XXXXXXXXXX). Splits commas, spaces, and new lines. */
export function parseWhatsappNumbers(raw: string): ParsedPhones {
  const parts = raw
    .split(/[\s,;|]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const numbers: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const part of parts) {
    const normalized = normalizeWhatsappTo(part);
    if (!normalized) {
      invalid.push(part);
      continue;
    }
    if (seen.has(normalized)) {
      duplicates += 1;
      continue;
    }
    seen.add(normalized);
    numbers.push(normalized);
  }

  return { numbers, invalid, duplicates };
}

export function normalizeWhatsappTo(input: string): string | null {
  let digits = input.replace(/[^\d]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91') && /^91[6-9]\d{9}$/.test(digits)) {
    return digits;
  }
  return null;
}

export const WHATSAPP_BULK_LIMIT = MAX_NUMBERS;
