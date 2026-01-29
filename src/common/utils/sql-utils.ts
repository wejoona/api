/**
 * SQL Utility Functions
 *
 * Provides security utilities for safe SQL query construction.
 * These utilities help prevent SQL injection and ensure safe handling
 * of user input in database queries.
 *
 * @module common/utils/sql-utils
 */

/**
 * Escapes SQL LIKE pattern wildcards in user input.
 *
 * LIKE queries in SQL interpret % and _ as wildcards. If user input
 * contains these characters, they must be escaped to be treated as
 * literal characters.
 *
 * SECURITY: Always use this function when constructing LIKE patterns
 * from user input to prevent:
 * - Information disclosure via wildcard patterns
 * - Performance degradation from full table scans
 *
 * @param input - The user input string to escape
 * @returns The escaped string safe for use in LIKE patterns
 *
 * @example
 * ```typescript
 * const userInput = "test%name";
 * const pattern = `%${escapeLikePattern(userInput)}%`;
 * // Result: "%test\\%name%"
 * ```
 *
 * @see OWASP SQL Injection Prevention Cheat Sheet
 */
export function escapeLikePattern(input: string): string {
  if (!input) {
    return '';
  }

  return input
    .replace(/\\/g, '\\\\') // Escape backslashes first (must be first!)
    .replace(/%/g, '\\%') // Escape percent (LIKE wildcard for any string)
    .replace(/_/g, '\\_'); // Escape underscore (LIKE wildcard for single char)
}

/**
 * Sanitizes and escapes a search term for use in SQL LIKE queries.
 *
 * Combines input sanitization with LIKE pattern escaping:
 * - Trims whitespace
 * - Limits length to prevent DoS
 * - Escapes SQL LIKE wildcards
 *
 * @param input - The user input string to sanitize
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns The sanitized and escaped string
 *
 * @example
 * ```typescript
 * const userSearch = "   John%Doe   ";
 * const safe = sanitizeSearchTerm(userSearch);
 * // Result: "John\\%Doe"
 * ```
 */
export function sanitizeSearchTerm(input: string, maxLength = 100): string {
  if (!input) {
    return '';
  }

  // Trim whitespace and limit length
  const trimmed = input.trim().substring(0, maxLength);

  // Escape LIKE pattern wildcards
  return escapeLikePattern(trimmed);
}

/**
 * Allowed columns for ORDER BY in different contexts.
 * Using const assertions provides type safety and runtime validation.
 *
 * SECURITY: Always validate ORDER BY columns against an allowlist.
 * Dynamic column names in ORDER BY are a SQL injection vector.
 */
export const ALLOWED_SORT_COLUMNS = {
  transaction: ['createdAt', 'amount', 'status', 'type'] as const,
  alert: ['createdAt', 'severity', 'alertType', 'isRead'] as const,
  user: ['createdAt', 'phone', 'email', 'status'] as const,
  audit: ['createdAt', 'action', 'resourceType'] as const,
} as const;

export type TransactionSortColumn =
  (typeof ALLOWED_SORT_COLUMNS.transaction)[number];
export type AlertSortColumn = (typeof ALLOWED_SORT_COLUMNS.alert)[number];
export type UserSortColumn = (typeof ALLOWED_SORT_COLUMNS.user)[number];
export type AuditSortColumn = (typeof ALLOWED_SORT_COLUMNS.audit)[number];

/**
 * Validates and returns a safe ORDER BY column name.
 *
 * SECURITY: This function prevents SQL injection via ORDER BY columns
 * by validating against an allowlist. If the input is not in the
 * allowlist, it returns the default column.
 *
 * @param input - The user-provided column name
 * @param allowedColumns - Array of allowed column names
 * @param defaultColumn - Column to use if input is invalid
 * @returns A validated column name safe for use in ORDER BY
 *
 * @example
 * ```typescript
 * const userSort = validateSortColumn(
 *   req.query.sortBy,
 *   ALLOWED_SORT_COLUMNS.transaction,
 *   'createdAt'
 * );
 * query.orderBy(`tx.${userSort}`, 'DESC');
 * ```
 */
export function validateSortColumn<T extends readonly string[]>(
  input: string | undefined | null,
  allowedColumns: T,
  defaultColumn: T[number],
): T[number] {
  if (!input) {
    return defaultColumn;
  }

  // Type-safe check against allowlist
  if ((allowedColumns as readonly string[]).includes(input)) {
    return input as T[number];
  }

  return defaultColumn;
}

/**
 * Validates and returns a safe sort order (ASC/DESC).
 *
 * @param input - The user-provided sort order
 * @param defaultOrder - Default order if input is invalid (default: 'DESC')
 * @returns Either 'ASC' or 'DESC'
 */
export function validateSortOrder(
  input: string | undefined | null,
  defaultOrder: 'ASC' | 'DESC' = 'DESC',
): 'ASC' | 'DESC' {
  if (!input) {
    return defaultOrder;
  }

  const normalized = input.toUpperCase();
  if (normalized === 'ASC' || normalized === 'DESC') {
    return normalized;
  }

  return defaultOrder;
}
