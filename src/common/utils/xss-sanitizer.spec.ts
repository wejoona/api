import {
  escapeHtml,
  stripHtmlTags,
  sanitizeText,
  sanitizeUrl,
  sanitizeObject,
  sanitizeFilename,
  createCSPHeader,
} from './xss-sanitizer';

describe('XSS Sanitizer', () => {
  describe('escapeHtml', () => {
    it('should escape basic HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
      );
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("onclick='alert(1)'")).toBe(
        'onclick&#x3D;&#x27;alert(1)&#x27;',
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should preserve safe text', () => {
      expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
    });

    it('should escape backticks for template literal injection', () => {
      expect(escapeHtml('`${alert(1)}`')).toBe('&#x60;${alert(1)}&#x60;');
    });
  });

  describe('stripHtmlTags', () => {
    it('should remove all HTML tags', () => {
      expect(stripHtmlTags('<p>Hello <strong>World</strong></p>')).toBe(
        'Hello World',
      );
    });

    it('should remove script tags and content', () => {
      const input = 'Before<script>alert("xss")</script>After';
      expect(stripHtmlTags(input)).toBe('Beforealert("xss")After');
    });

    it('should remove HTML comments', () => {
      expect(stripHtmlTags('Hello <!-- comment --> World')).toBe(
        'Hello  World',
      );
    });

    it('should handle self-closing tags', () => {
      expect(stripHtmlTags('Line 1<br/>Line 2')).toBe('Line 1Line 2');
    });

    it('should handle malformed tags', () => {
      expect(stripHtmlTags('<div<script>alert(1)</script>')).toBe('alert(1)');
    });

    it('should handle null and undefined', () => {
      expect(stripHtmlTags(null)).toBe('');
      expect(stripHtmlTags(undefined)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should escape HTML by default', () => {
      expect(sanitizeText('<b>Bold</b>')).toBe('&lt;b&gt;Bold&lt;&#x2F;b&gt;');
    });

    it('should strip HTML when specified', () => {
      expect(sanitizeText('<b>Bold</b>', { htmlMode: 'strip' })).toBe('Bold');
    });

    it('should truncate to maxLength', () => {
      expect(sanitizeText('Hello World', { maxLength: 5 })).toBe('Hello');
    });

    it('should preserve newlines by default', () => {
      expect(sanitizeText('Line 1\nLine 2')).toBe('Line 1\nLine 2');
    });

    it('should remove newlines when specified', () => {
      expect(
        sanitizeText('Line 1\nLine 2', { preserveNewlines: false }),
      ).toBe('Line 1 Line 2');
    });

    it('should remove null bytes and control characters', () => {
      expect(sanitizeText('Hello\x00World\x1F!')).toBe('HelloWorld!');
    });

    it('should trim whitespace', () => {
      expect(sanitizeText('  Hello  ')).toBe('Hello');
    });

    it('should handle XSS payloads', () => {
      const payloads = [
        '<img src=x onerror=alert(1)>',
        '<svg/onload=alert(1)>',
        '"><script>alert(1)</script>',
        "javascript:alert('XSS')",
        '<iframe src="javascript:alert(1)">',
      ];

      for (const payload of payloads) {
        const result = sanitizeText(payload);
        expect(result).not.toContain('<script');
        expect(result).not.toContain('<img');
        expect(result).not.toContain('<svg');
        expect(result).not.toContain('<iframe');
      }
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should allow valid https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should allow relative URLs', () => {
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    });

    it('should block javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
    });

    it('should block data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should block vbscript: protocol', () => {
      expect(sanitizeUrl('vbscript:alert(1)')).toBe('');
    });

    it('should block file: protocol', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeUrl(null)).toBe('');
      expect(sanitizeUrl(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });

    it('should allow mailto: protocol', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe(
        'mailto:test@example.com',
      );
    });

    it('should allow tel: protocol', () => {
      expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string properties', () => {
      const input = {
        name: '<script>alert(1)</script>',
        age: 25,
        isActive: true,
      };

      const result = sanitizeObject(input);
      expect(result.name).toBe(
        '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;',
      );
      expect(result.age).toBe(25);
      expect(result.isActive).toBe(true);
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          email: 'john@example.com',
        },
      };

      const result = sanitizeObject(input);
      expect(result.user.name).toBe('&lt;b&gt;John&lt;&#x2F;b&gt;');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['<script>', 'normal', '<img>'],
      };

      const result = sanitizeObject(input);
      expect(result.tags[0]).toBe('&lt;script&gt;');
      expect(result.tags[1]).toBe('normal');
      expect(result.tags[2]).toBe('&lt;img&gt;');
    });

    it('should sanitize only specified fields', () => {
      const input = {
        name: '<b>John</b>',
        description: '<i>Test</i>',
      };

      const result = sanitizeObject(input, ['name']);
      expect(result.name).toBe('&lt;b&gt;John&lt;&#x2F;b&gt;');
      expect(result.description).toBe('<i>Test</i>');
    });

    it('should handle null object', () => {
      expect(sanitizeObject(null as any)).toBe(null);
    });
  });

  describe('sanitizeFilename', () => {
    it('should allow valid filenames', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf');
    });

    it('should remove path traversal', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
    });

    it('should remove slashes', () => {
      expect(sanitizeFilename('path/to/file.txt')).toBe('pathtofile.txt');
      expect(sanitizeFilename('path\\to\\file.txt')).toBe('pathtofile.txt');
    });

    it('should remove control characters', () => {
      expect(sanitizeFilename('file\x00name.txt')).toBe('filename.txt');
    });

    it('should remove Windows reserved characters', () => {
      expect(sanitizeFilename('file<name>.txt')).toBe('filename.txt');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeFilename(null)).toBe(null);
      expect(sanitizeFilename(undefined)).toBe(null);
    });

    it('should return null for empty result', () => {
      expect(sanitizeFilename('../../../')).toBe(null);
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFilename(longName);
      expect(result?.length).toBeLessThanOrEqual(255);
    });
  });

  describe('createCSPHeader', () => {
    it('should create basic CSP with defaults', () => {
      const csp = createCSPHeader();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("base-uri 'self'");
    });

    it('should allow custom script-src', () => {
      const csp = createCSPHeader({
        scriptSrc: ["'self'", 'https://cdn.example.com'],
      });
      expect(csp).toContain("script-src 'self' https://cdn.example.com");
    });

    it('should include report-uri when specified', () => {
      const csp = createCSPHeader({
        reportUri: '/csp-report',
      });
      expect(csp).toContain('report-uri /csp-report');
    });

    it('should allow all directive customizations', () => {
      const csp = createCSPHeader({
        defaultSrc: ["'self'", 'https:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.example.com'],
        fontSrc: ["'self'", 'https://fonts.googleapis.com'],
      });

      expect(csp).toContain("default-src 'self' https:");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("img-src 'self' data: https:");
      expect(csp).toContain("connect-src 'self' https://api.example.com");
      expect(csp).toContain("font-src 'self' https://fonts.googleapis.com");
    });
  });
});
