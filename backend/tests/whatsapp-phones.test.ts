import { describe, expect, it } from 'vitest';
import { normalizeWhatsappTo, parseWhatsappNumbers } from '../src/utils/whatsapp-phones';

describe('whatsapp phone parse', () => {
  it('prefixes 10-digit Indian numbers', () => {
    expect(normalizeWhatsappTo('7041501799')).toBe('917041501799');
    expect(normalizeWhatsappTo('+91 70415 01799')).toBe('917041501799');
    expect(normalizeWhatsappTo('07041501799')).toBe('917041501799');
  });

  it('splits a bulk paste and drops duplicates and junk', () => {
    const parsed = parseWhatsappNumbers('7041501799, 9876543210\n7041501799\nabc\n12345');
    expect(parsed.numbers).toEqual(['917041501799', '919876543210']);
    expect(parsed.duplicates).toBe(1);
    expect(parsed.invalid).toEqual(['abc', '12345']);
  });
});