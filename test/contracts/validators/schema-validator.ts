/**
 * Schema Validator
 *
 * Utilities for validating API responses against contract schemas.
 */

import { ContractSchema, ContractField, FieldType } from '../schemas/types';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Single validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  expectedType?: string;
  actualType?: string;
  value?: unknown;
}

/**
 * Validate an object against a contract schema
 */
export function validateSchema(
  obj: unknown,
  schema: ContractSchema,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof obj !== 'object' || obj === null) {
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: `Expected object, got ${typeof obj}`,
          expectedType: 'object',
          actualType: typeof obj,
        },
      ],
    };
  }

  const record = obj as Record<string, unknown>;
  validateFields(record, schema.fields, '', errors);

  // Check for unexpected fields in strict mode
  if (schema.strictMode) {
    for (const key of Object.keys(record)) {
      if (!(key in schema.fields)) {
        errors.push({
          path: key,
          message: `Unexpected field: ${key}`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate fields recursively
 */
function validateFields(
  obj: Record<string, unknown>,
  fields: Record<string, ContractField>,
  basePath: string,
  errors: ValidationError[],
): void {
  for (const [fieldName, field] of Object.entries(fields)) {
    const path = basePath ? `${basePath}.${fieldName}` : fieldName;
    const value = obj[fieldName];

    // Check required fields
    if (!field.optional && value === undefined) {
      errors.push({
        path,
        message: `Missing required field`,
      });
      continue;
    }

    // Skip if optional and not present
    if (value === undefined) {
      continue;
    }

    // Check null
    if (value === null) {
      if (!field.nullable) {
        errors.push({
          path,
          message: `Field cannot be null`,
        });
      }
      continue;
    }

    // Validate type
    validateFieldType(value, field, path, errors);
  }
}

/**
 * Validate field type
 */
function validateFieldType(
  value: unknown,
  field: ContractField,
  path: string,
  errors: ValidationError[],
): void {
  switch (field.type) {
    case FieldType.STRING:
      if (typeof value !== 'string') {
        errors.push({
          path,
          message: `Expected string`,
          expectedType: 'string',
          actualType: typeof value,
          value,
        });
      } else {
        validateStringConstraints(value, field, path, errors);
      }
      break;

    case FieldType.NUMBER:
      if (typeof value !== 'number') {
        errors.push({
          path,
          message: `Expected number`,
          expectedType: 'number',
          actualType: typeof value,
          value,
        });
      } else {
        validateNumberConstraints(value, field, path, errors);
      }
      break;

    case FieldType.BOOLEAN:
      if (typeof value !== 'boolean') {
        errors.push({
          path,
          message: `Expected boolean`,
          expectedType: 'boolean',
          actualType: typeof value,
          value,
        });
      }
      break;

    case FieldType.DATE:
      if (typeof value !== 'string' || !isValidISODate(value)) {
        errors.push({
          path,
          message: `Expected ISO date string`,
          expectedType: 'ISO date',
          actualType: typeof value,
          value,
        });
      }
      break;

    case FieldType.UUID:
      if (typeof value !== 'string' || !isValidUUID(value)) {
        errors.push({
          path,
          message: `Expected UUID`,
          expectedType: 'UUID',
          actualType: typeof value,
          value,
        });
      }
      break;

    case FieldType.EMAIL:
      if (typeof value !== 'string' || !isValidEmail(value)) {
        errors.push({
          path,
          message: `Expected email`,
          expectedType: 'email',
          actualType: typeof value,
          value,
        });
      }
      break;

    case FieldType.PHONE:
      if (typeof value !== 'string' || !isValidPhone(value)) {
        errors.push({
          path,
          message: `Expected E.164 phone number`,
          expectedType: 'E.164 phone',
          actualType: typeof value,
          value,
        });
      }
      break;

    case FieldType.DECIMAL:
      if (typeof value !== 'number' && typeof value !== 'string') {
        errors.push({
          path,
          message: `Expected decimal (number or string)`,
          expectedType: 'decimal',
          actualType: typeof value,
          value,
        });
      } else if (typeof value === 'string' && isNaN(parseFloat(value))) {
        errors.push({
          path,
          message: `Invalid decimal string`,
          value,
        });
      }
      break;

    case FieldType.ARRAY:
      if (!Array.isArray(value)) {
        errors.push({
          path,
          message: `Expected array`,
          expectedType: 'array',
          actualType: typeof value,
          value,
        });
      } else if (field.itemType) {
        validateArrayItems(value, field, path, errors);
      }
      break;

    case FieldType.OBJECT:
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push({
          path,
          message: `Expected object`,
          expectedType: 'object',
          actualType: Array.isArray(value) ? 'array' : typeof value,
          value,
        });
      } else if (field.nestedSchema) {
        validateFields(
          value as Record<string, unknown>,
          field.nestedSchema.fields,
          path,
          errors,
        );
      }
      break;
  }

  // Validate enum
  if (field.enum && !field.enum.includes(value as string)) {
    errors.push({
      path,
      message: `Invalid enum value. Expected one of: ${field.enum.join(', ')}`,
      value,
    });
  }
}

/**
 * Validate string constraints
 */
function validateStringConstraints(
  value: string,
  field: ContractField,
  path: string,
  errors: ValidationError[],
): void {
  if (field.minLength !== undefined && value.length < field.minLength) {
    errors.push({
      path,
      message: `String too short. Minimum length: ${field.minLength}`,
      value,
    });
  }

  if (field.maxLength !== undefined && value.length > field.maxLength) {
    errors.push({
      path,
      message: `String too long. Maximum length: ${field.maxLength}`,
      value,
    });
  }

  if (field.pattern) {
    const regex = new RegExp(field.pattern);
    if (!regex.test(value)) {
      errors.push({
        path,
        message: `String does not match pattern: ${field.pattern}`,
        value,
      });
    }
  }
}

/**
 * Validate number constraints
 */
function validateNumberConstraints(
  value: number,
  field: ContractField,
  path: string,
  errors: ValidationError[],
): void {
  if (field.min !== undefined && value < field.min) {
    errors.push({
      path,
      message: `Number too small. Minimum: ${field.min}`,
      value,
    });
  }

  if (field.max !== undefined && value > field.max) {
    errors.push({
      path,
      message: `Number too large. Maximum: ${field.max}`,
      value,
    });
  }
}

/**
 * Validate array items
 */
function validateArrayItems(
  arr: unknown[],
  field: ContractField,
  path: string,
  errors: ValidationError[],
): void {
  if (!field.itemType) return;

  for (let i = 0; i < arr.length; i++) {
    const itemPath = `${path}[${i}]`;
    const item = arr[i];

    if (typeof field.itemType === 'object') {
      // Nested schema
      if (typeof item !== 'object' || item === null) {
        errors.push({
          path: itemPath,
          message: `Expected object`,
          expectedType: 'object',
          actualType: typeof item,
        });
      } else {
        validateFields(
          item as Record<string, unknown>,
          field.itemType.fields,
          itemPath,
          errors,
        );
      }
    } else {
      // Simple type
      const itemField: ContractField = { type: field.itemType };
      validateFieldType(item, itemField, itemPath, errors);
    }
  }
}

// Utility functions
function isValidISODate(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('T');
}

function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

function isValidPhone(value: string): boolean {
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(value);
}

/**
 * Generate example data from a schema
 */
export function generateExample(
  schema: ContractSchema,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [fieldName, field] of Object.entries(schema.fields)) {
    if (field.optional && Math.random() > 0.5) continue;
    if (field.nullable && Math.random() > 0.8) {
      result[fieldName] = null;
      continue;
    }

    result[fieldName] = generateFieldExample(field);
  }

  return result;
}

/**
 * Generate example value for a field
 */
function generateFieldExample(field: ContractField): unknown {
  if (field.example !== undefined) {
    return field.example;
  }

  if (field.enum && field.enum.length > 0) {
    return field.enum[0];
  }

  switch (field.type) {
    case FieldType.STRING:
      return 'example string';
    case FieldType.NUMBER:
    case FieldType.DECIMAL:
      return field.min ?? 0;
    case FieldType.BOOLEAN:
      return true;
    case FieldType.DATE:
      return new Date().toISOString();
    case FieldType.UUID:
      return '123e4567-e89b-12d3-a456-426614174000';
    case FieldType.EMAIL:
      return 'example@example.com';
    case FieldType.PHONE:
      return '+2250701234567';
    case FieldType.ARRAY:
      return [];
    case FieldType.OBJECT:
      if (field.nestedSchema) {
        return generateExample(field.nestedSchema);
      }
      return {};
    default:
      return null;
  }
}
