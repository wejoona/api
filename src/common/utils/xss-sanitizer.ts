/**
 * XSS Input Sanitizer Utilities
 *
 * Provides functions to sanitize user input and prevent XSS attacks.
 * These utilities should be used for any user-provided text content
 * that may be rendered in web contexts (dashboard, emails, webhooks).
 *
 * Security Benefits:
 * - Prevents stored XSS attacks (OWASP A03:2021 - Injection)
 * - Sanitizes HTML entities in user-provided text
 * - Removes dangerous content while preserving legitimate text
 *
 * @see OWASP XSS Prevention Cheat Sheet
 * @see CWE-79: Improper Neutralization of Input During Web Page Generation
 */

/**
 * HTML entity map for encoding dangerous characters
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 * Use this for any user input that will be displayed in HTML context
 *
 * @param input - Raw user input string
 * @returns Escaped string safe for HTML rendering
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }

  return String(input).replace(
    /[&<>"'`=/]/g,
    (char) => HTML_ENTITIES[char] || char,
  );
}

/**
 * Strip all HTML tags from input
 * Use this when HTML is not allowed at all
 *
 * @param input - Raw user input string
 * @returns String with all HTML tags removed
 */
export function stripHtmlTags(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }

  // Remove HTML tags but preserve text content
  return String(input)
    .replace(/<[^>]*>/g, '')
    .replace(/<!--[\s\S]*?-->/g, ''); // Also remove HTML comments
}

/**
 * Sanitize text for safe storage and display
 * Combines HTML escaping with control character removal
 *
 * @param input - Raw user input string
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeText(
  input: string | null | undefined,
  options: {
    /**
     * Maximum length to truncate to (default: no limit)
     */
    maxLength?: number;
    /**
     * Whether to preserve newlines (default: true)
     */
    preserveNewlines?: boolean;
    /**
     * Whether to escape HTML or strip it entirely (default: 'escape')
     */
    htmlMode?: 'escape' | 'strip';
  } = {},
): string {
  if (input === null || input === undefined) {
    return '';
  }

  const { maxLength, preserveNewlines = true, htmlMode = 'escape' } = options;

  let result = String(input);

  // Remove null bytes and other control characters (except newlines/tabs if preserving)
  if (preserveNewlines) {
    // Keep \n (0x0A), \r (0x0D), \t (0x09) but remove other control chars
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    result = result.replace(/[\x00-\x1F\x7F]/g, ' ');
  }

  // Handle HTML based on mode
  if (htmlMode === 'strip') {
    result = stripHtmlTags(result);
  } else {
    result = escapeHtml(result);
  }

  // Truncate if maxLength specified
  if (maxLength !== undefined && result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return result.trim();
}

/**
 * Sanitize a URL to prevent javascript: or data: protocol attacks
 *
 * @param url - URL string to validate
 * @returns Sanitized URL or empty string if invalid/dangerous
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (url === null || url === undefined || url.trim() === '') {
    return '';
  }

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'mhtml:',
  ];

  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }

  // Allow http, https, mailto, tel protocols and relative URLs
  const allowedProtocols = ['http://', 'https://', 'mailto:', 'tel:', '/'];
  const hasAllowedProtocol = allowedProtocols.some((p) =>
    trimmed.startsWith(p),
  );

  // If no protocol, treat as relative URL (starts with / or alphanumeric)
  if (!hasAllowedProtocol && !trimmed.match(/^[a-z0-9]/)) {
    return '';
  }

  return url.trim();
}

/**
 * Sanitize object properties recursively
 * Useful for sanitizing entire DTOs or request bodies
 *
 * @param obj - Object to sanitize
 * @param fieldsToSanitize - Array of field names to sanitize (default: all string fields)
 * @returns New object with sanitized string properties
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToSanitize?: string[],
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj };

  for (const [key, value] of Object.entries(result)) {
    // Check if we should sanitize this field
    const shouldSanitize = !fieldsToSanitize || fieldsToSanitize.includes(key);

    if (typeof value === 'string' && shouldSanitize) {
      (result as Record<string, unknown>)[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>, fieldsToSanitize)
          : typeof item === 'string' && shouldSanitize
            ? sanitizeText(item)
            : item,
      );
    } else if (typeof value === 'object' && value !== null) {
      (result as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>,
        fieldsToSanitize,
      );
    }
  }

  return result;
}

/**
 * Validate and sanitize a filename to prevent path traversal
 *
 * @param filename - Filename to sanitize
 * @returns Safe filename or null if completely invalid
 */
export function sanitizeFilename(
  filename: string | null | undefined,
): string | null {
  if (!filename) {
    return null;
  }

  // Remove path components
  let safe = String(filename)
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>:"|?*]/g, '') // Remove Windows reserved characters
    .trim();

  // Limit length
  if (safe.length > 255) {
    safe = safe.substring(0, 255);
  }

  // Must have some content
  if (safe.length === 0) {
    return null;
  }

  return safe;
}

/**
 * Create a Content-Security-Policy header value for XSS protection
 * Use this when generating dynamic HTML responses
 *
 * @param options - CSP configuration options
 * @returns CSP header value string
 */
export function createCSPHeader(
  options: {
    defaultSrc?: string[];
    scriptSrc?: string[];
    styleSrc?: string[];
    imgSrc?: string[];
    connectSrc?: string[];
    fontSrc?: string[];
    objectSrc?: string[];
    mediaSrc?: string[];
    frameSrc?: string[];
    reportUri?: string;
  } = {},
): string {
  const directives: string[] = [];

  const defaultSrc = options.defaultSrc || ["'self'"];
  directives.push(`default-src ${defaultSrc.join(' ')}`);

  if (options.scriptSrc) {
    directives.push(`script-src ${options.scriptSrc.join(' ')}`);
  }

  if (options.styleSrc) {
    directives.push(`style-src ${options.styleSrc.join(' ')}`);
  }

  if (options.imgSrc) {
    directives.push(`img-src ${options.imgSrc.join(' ')}`);
  }

  if (options.connectSrc) {
    directives.push(`connect-src ${options.connectSrc.join(' ')}`);
  }

  if (options.fontSrc) {
    directives.push(`font-src ${options.fontSrc.join(' ')}`);
  }

  if (options.objectSrc) {
    directives.push(`object-src ${options.objectSrc.join(' ')}`);
  } else {
    // Default to 'none' for object-src (block plugins)
    directives.push("object-src 'none'");
  }

  if (options.mediaSrc) {
    directives.push(`media-src ${options.mediaSrc.join(' ')}`);
  }

  if (options.frameSrc) {
    directives.push(`frame-src ${options.frameSrc.join(' ')}`);
  } else {
    // Default to 'none' for frame-src
    directives.push("frame-src 'none'");
  }

  // Always add base-uri restriction
  directives.push("base-uri 'self'");

  // Add form-action restriction
  directives.push("form-action 'self'");

  if (options.reportUri) {
    directives.push(`report-uri ${options.reportUri}`);
  }

  return directives.join('; ');
}
