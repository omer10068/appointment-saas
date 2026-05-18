import { BadRequestException } from '@nestjs/common';

/**
 * Normalize a phone number to E.164 format.
 *
 * Supported Israeli input formats:
 *   050-123-4567  →  +972501234567
 *   0501234567    →  +972501234567
 *   +972501234567 →  +972501234567
 *   972501234567  →  +972501234567
 *
 * @param raw   Raw phone input from the user.
 * @param country ISO 3166-1 alpha-2 country code for the default country prefix.
 *               Currently only 'IL' (Israel, +972) is supported.
 */
export function normalizePhone(raw: string, country: 'IL' = 'IL'): string {
  if (!raw || !raw.trim()) {
    throw new BadRequestException('Phone number is required');
  }

  // Remove spaces, hyphens, parentheses, dots — keep digits and leading +
  const stripped = raw.replace(/[\s\-().]/g, '');

  if (stripped.startsWith('+')) {
    const digits = stripped.slice(1).replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      throw new BadRequestException(`Invalid phone number format: "${raw}"`);
    }
    return '+' + digits;
  }

  const digits = stripped.replace(/\D/g, '');

  if (country === 'IL') {
    if (digits.startsWith('972')) {
      // International format without '+': 972501234567
      const local = digits.slice(3);
      if (local.length < 7 || local.length > 12) {
        throw new BadRequestException(`Invalid phone number format: "${raw}"`);
      }
      return '+972' + local;
    }

    if (digits.startsWith('0')) {
      // Israeli local format: 0501234567 → drop leading 0 → 501234567
      const local = digits.slice(1);
      if (local.length < 7 || local.length > 10) {
        throw new BadRequestException(`Invalid phone number format: "${raw}"`);
      }
      return '+972' + local;
    }

    // Bare digits without country code — assume Israeli
    if (digits.length >= 7 && digits.length <= 10) {
      return '+972' + digits;
    }
  }

  throw new BadRequestException(`Invalid phone number format: "${raw}"`);
}
