/**
 * SQL Utilities Test Suite
 *
 * Tests for SQL injection prevention utilities.
 */

import {
  escapeLikePattern,
  sanitizeSearchTerm,
  validateSortColumn,
  validateSortOrder,
  ALLOWED_SORT_COLUMNS,
} from './sql-utils';

describe('SQL Utilities', () => {
  describe('escapeLikePattern', () => {
    it('should return empty string for null/undefined input', () => {
      expect(escapeLikePattern(null as any)).toBe('');
      expect(escapeLikePattern(undefined as any)).toBe('');
      expect(escapeLikePattern('')).toBe('');
    });

    it('should escape percent wildcard', () => {
      expect(escapeLikePattern('test%name')).toBe('test\\%name');
      expect(escapeLikePattern('%start')).toBe('\\%start');
      expect(escapeLikePattern('end%')).toBe('end\\%');
      expect(escapeLikePattern('100%')).toBe('100\\%');
    });

    it('should escape underscore wildcard', () => {
      expect(escapeLikePattern('test_name')).toBe('test\\_name');
      expect(escapeLikePattern('_start')).toBe('\\_start');
      expect(escapeLikePattern('end_')).toBe('end\\_');
    });

    it('should escape backslashes', () => {
      expect(escapeLikePattern('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should handle multiple wildcards', () => {
      expect(escapeLikePattern('%test_value%')).toBe('\\%test\\_value\\%');
    });

    it('should handle mixed escape sequences', () => {
      expect(escapeLikePattern('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
    });

    it('should not modify safe strings', () => {
      expect(escapeLikePattern('John Doe')).toBe('John Doe');
      expect(escapeLikePattern('test@example.com')).toBe('test@example.com');
      expect(escapeLikePattern('+225 01 23 45 67')).toBe('+225 01 23 45 67');
    });

    // Security test cases
    it('should prevent SQL injection via LIKE patterns', () => {
      // These patterns could cause full table scans or data leakage
      const maliciousPatterns = [
        '%', // Match everything
        '_%', // Match everything with at least 1 char
        '%%', // Match everything
        '%a%b%c%', // Complex pattern
      ];

      maliciousPatterns.forEach((pattern) => {
        const escaped = escapeLikePattern(pattern);
        // After escaping, there should be no unescaped % or _ characters
        // All % should be preceded by \
        const unescapedPercent = escaped.match(/(?<!\\)%/g);
        const unescapedUnderscore = escaped.match(/(?<!\\)_/g);
        expect(unescapedPercent).toBeNull();
        expect(unescapedUnderscore).toBeNull();
      });
    });
  });

  describe('sanitizeSearchTerm', () => {
    it('should trim whitespace', () => {
      expect(sanitizeSearchTerm('  test  ')).toBe('test');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(200);
      expect(sanitizeSearchTerm(longString).length).toBe(100);
      expect(sanitizeSearchTerm(longString, 50).length).toBe(50);
    });

    it('should escape LIKE patterns', () => {
      expect(sanitizeSearchTerm('  test%value  ')).toBe('test\\%value');
    });

    it('should handle empty input', () => {
      expect(sanitizeSearchTerm('')).toBe('');
      expect(sanitizeSearchTerm(null as any)).toBe('');
    });
  });

  describe('validateSortColumn', () => {
    it('should return valid column when in allowlist', () => {
      expect(
        validateSortColumn(
          'createdAt',
          ALLOWED_SORT_COLUMNS.transaction,
          'createdAt',
        ),
      ).toBe('createdAt');

      expect(
        validateSortColumn(
          'amount',
          ALLOWED_SORT_COLUMNS.transaction,
          'createdAt',
        ),
      ).toBe('amount');
    });

    it('should return default for invalid column', () => {
      expect(
        validateSortColumn(
          'malicious_column; DROP TABLE users;--',
          ALLOWED_SORT_COLUMNS.transaction,
          'createdAt',
        ),
      ).toBe('createdAt');

      expect(
        validateSortColumn(
          'unknown_column',
          ALLOWED_SORT_COLUMNS.transaction,
          'createdAt',
        ),
      ).toBe('createdAt');
    });

    it('should return default for null/undefined', () => {
      expect(
        validateSortColumn(null, ALLOWED_SORT_COLUMNS.transaction, 'createdAt'),
      ).toBe('createdAt');

      expect(
        validateSortColumn(
          undefined,
          ALLOWED_SORT_COLUMNS.transaction,
          'createdAt',
        ),
      ).toBe('createdAt');
    });

    // Security test cases
    it('should prevent SQL injection attempts in sort columns', () => {
      const injectionAttempts = [
        "createdAt; DROP TABLE users;--",
        "createdAt' OR '1'='1",
        'createdAt UNION SELECT * FROM users',
        '1; UPDATE users SET role=admin',
        'createdAt /* comment */',
      ];

      injectionAttempts.forEach((attempt) => {
        expect(
          validateSortColumn(
            attempt,
            ALLOWED_SORT_COLUMNS.transaction,
            'createdAt',
          ),
        ).toBe('createdAt');
      });
    });
  });

  describe('validateSortOrder', () => {
    it('should return valid sort order', () => {
      expect(validateSortOrder('ASC')).toBe('ASC');
      expect(validateSortOrder('DESC')).toBe('DESC');
      expect(validateSortOrder('asc')).toBe('ASC');
      expect(validateSortOrder('desc')).toBe('DESC');
    });

    it('should return default for invalid order', () => {
      expect(validateSortOrder('INVALID')).toBe('DESC');
      expect(validateSortOrder('ascending')).toBe('DESC');
      expect(validateSortOrder('')).toBe('DESC');
    });

    it('should return default for null/undefined', () => {
      expect(validateSortOrder(null)).toBe('DESC');
      expect(validateSortOrder(undefined)).toBe('DESC');
    });

    it('should allow custom default', () => {
      expect(validateSortOrder(null, 'ASC')).toBe('ASC');
      expect(validateSortOrder('invalid', 'ASC')).toBe('ASC');
    });

    // Security test cases
    it('should prevent SQL injection in sort order', () => {
      const injectionAttempts = [
        "DESC; DROP TABLE users;--",
        "ASC' OR '1'='1",
        'DESC UNION SELECT',
      ];

      injectionAttempts.forEach((attempt) => {
        expect(validateSortOrder(attempt)).toBe('DESC');
      });
    });
  });

  describe('ALLOWED_SORT_COLUMNS', () => {
    it('should define transaction sort columns', () => {
      expect(ALLOWED_SORT_COLUMNS.transaction).toContain('createdAt');
      expect(ALLOWED_SORT_COLUMNS.transaction).toContain('amount');
    });

    it('should define alert sort columns', () => {
      expect(ALLOWED_SORT_COLUMNS.alert).toContain('createdAt');
      expect(ALLOWED_SORT_COLUMNS.alert).toContain('severity');
    });

    it('should define user sort columns', () => {
      expect(ALLOWED_SORT_COLUMNS.user).toContain('createdAt');
      expect(ALLOWED_SORT_COLUMNS.user).toContain('phone');
    });

    it('should define audit sort columns', () => {
      expect(ALLOWED_SORT_COLUMNS.audit).toContain('createdAt');
      expect(ALLOWED_SORT_COLUMNS.audit).toContain('action');
    });
  });
});
