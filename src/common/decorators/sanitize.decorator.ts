/**
 * Sanitize Decorator for class-transformer
 *
 * Use this decorator on DTO string properties to automatically sanitize
 * user input and prevent XSS attacks.
 *
 * @see OWASP A03:2021 - Injection
 * @see CWE-79: Improper Neutralization of Input During Web Page Generation
 *
 * @example
 * class CreateTicketDto {
 *   @SanitizeHtml()
 *   @IsString()
 *   subject: string;
 *
 *   @SanitizeHtml({ maxLength: 5000 })
 *   @IsString()
 *   message: string;
 * }
 */

import { Transform } from 'class-transformer';
import {
  sanitizeText,
  stripHtmlTags,
  escapeHtml,
} from '../utils/xss-sanitizer';

export interface SanitizeOptions {
  /**
   * Maximum length to truncate to (optional)
   */
  maxLength?: number;
  /**
   * Whether to preserve newlines (default: true)
   */
  preserveNewlines?: boolean;
  /**
   * 'escape' - escape HTML entities (safe for display)
   * 'strip' - remove all HTML tags entirely
   * 'none' - no HTML processing (use with caution)
   */
  htmlMode?: 'escape' | 'strip' | 'none';
}

/**
 * Decorator to sanitize string input by escaping HTML entities
 * Safe default for most text fields
 *
 * @param options - Sanitization options
 */
export function SanitizeHtml(options: SanitizeOptions = {}) {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    if (options.htmlMode === 'none') {
      return value;
    }

    return sanitizeText(value, {
      maxLength: options.maxLength,
      preserveNewlines: options.preserveNewlines ?? true,
      htmlMode: options.htmlMode ?? 'escape',
    });
  });
}

/**
 * Decorator to strip all HTML tags from input
 * Use for fields where no HTML is expected
 */
export function StripHtml() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    return stripHtmlTags(value);
  });
}

/**
 * Decorator for fields that may contain safe HTML
 * Escapes dangerous characters but preserves structure
 */
export function EscapeHtml() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    return escapeHtml(value);
  });
}

/**
 * Decorator for note/message/description fields
 * Combines sanitization with length limit
 *
 * @param maxLength - Maximum allowed length (default: 5000)
 */
export function SanitizeNote(maxLength = 5000) {
  return SanitizeHtml({
    maxLength,
    preserveNewlines: true,
    htmlMode: 'escape',
  });
}

/**
 * Decorator for single-line text fields (names, titles, etc.)
 * Strips newlines and limits length
 *
 * @param maxLength - Maximum allowed length (default: 255)
 */
export function SanitizeSingleLine(maxLength = 255) {
  return SanitizeHtml({
    maxLength,
    preserveNewlines: false,
    htmlMode: 'strip',
  });
}
