/**
 * Custom Jest Matchers for Contract Testing
 *
 * These matchers validate API responses against mobile app contracts.
 */

import { ContractSchema, FieldType, ContractField } from '../schemas/types';

/**
 * Validates that an object matches a contract schema
 */
export function toMatchContract(
  this: jest.MatcherContext,
  received: unknown,
  contract: ContractSchema,
): jest.CustomMatcherResult {
  const errors: string[] = [];

  if (typeof received !== 'object' || received === null) {
    return {
      pass: false,
      message: () => `Expected an object, received ${typeof received}`,
    };
  }

  const obj = received as Record<string, unknown>;

  // Check required fields
  for (const [fieldName, fieldDef] of Object.entries(contract.fields)) {
    const field = fieldDef;
    const value = obj[fieldName];

    // Check if required field is present
    if (!field.optional && value === undefined) {
      errors.push(`Missing required field: ${fieldName}`);
      continue;
    }

    // Skip validation if field is optional and not present
    if (value === undefined) {
      continue;
    }

    // Check nullability
    if (value === null) {
      if (!field.nullable) {
        errors.push(`Field ${fieldName} cannot be null`);
      }
      continue;
    }

    // Validate type
    const typeError = validateType(fieldName, value, field);
    if (typeError) {
      errors.push(typeError);
    }

    // Validate enum values
    if (field.enum && !field.enum.includes(value as string)) {
      errors.push(
        `Field ${fieldName} has invalid enum value: ${value}. Expected one of: ${field.enum.join(', ')}`,
      );
    }
  }

  // Check for unexpected fields (strict mode)
  if (contract.strictMode) {
    for (const key of Object.keys(obj)) {
      if (!(key in contract.fields)) {
        errors.push(`Unexpected field: ${key}`);
      }
    }
  }

  return {
    pass: errors.length === 0,
    message: () =>
      errors.length === 0
        ? `Response matches contract: ${contract.name}`
        : `Contract validation failed for ${contract.name}:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
  };
}

/**
 * Validates type of a field value
 */
function validateType(
  fieldName: string,
  value: unknown,
  field: ContractField,
): string | null {
  switch (field.type) {
    case FieldType.STRING:
      if (typeof value !== 'string') {
        return `Field ${fieldName} expected string, got ${typeof value}`;
      }
      break;

    case FieldType.NUMBER:
      if (typeof value !== 'number') {
        return `Field ${fieldName} expected number, got ${typeof value}`;
      }
      break;

    case FieldType.BOOLEAN:
      if (typeof value !== 'boolean') {
        return `Field ${fieldName} expected boolean, got ${typeof value}`;
      }
      break;

    case FieldType.DATE:
      if (typeof value !== 'string' || !isValidISODate(value)) {
        return `Field ${fieldName} expected ISO date string, got ${value}`;
      }
      break;

    case FieldType.ARRAY:
      if (!Array.isArray(value)) {
        return `Field ${fieldName} expected array, got ${typeof value}`;
      }
      if (field.itemType) {
        for (let i = 0; i < value.length; i++) {
          const itemError = validateArrayItem(
            `${fieldName}[${i}]`,
            value[i],
            field.itemType,
          );
          if (itemError) {
            return itemError;
          }
        }
      }
      break;

    case FieldType.OBJECT:
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `Field ${fieldName} expected object, got ${typeof value}`;
      }
      if (field.nestedSchema) {
        const result = validateNestedObject(
          fieldName,
          value,
          field.nestedSchema,
        );
        if (result) {
          return result;
        }
      }
      break;

    case FieldType.UUID:
      if (typeof value !== 'string' || !isValidUUID(value)) {
        return `Field ${fieldName} expected UUID, got ${value}`;
      }
      break;

    case FieldType.EMAIL:
      if (typeof value !== 'string' || !isValidEmail(value)) {
        return `Field ${fieldName} expected email, got ${value}`;
      }
      break;

    case FieldType.PHONE:
      if (typeof value !== 'string' || !isValidPhone(value)) {
        return `Field ${fieldName} expected phone (E.164), got ${value}`;
      }
      break;

    case FieldType.DECIMAL:
      // Accept both number and string representation of decimals
      if (typeof value !== 'number' && typeof value !== 'string') {
        return `Field ${fieldName} expected decimal (number or string), got ${typeof value}`;
      }
      if (typeof value === 'string' && isNaN(parseFloat(value))) {
        return `Field ${fieldName} expected valid decimal string, got ${value}`;
      }
      break;
  }

  return null;
}

/**
 * Validates array items
 */
function validateArrayItem(
  path: string,
  value: unknown,
  itemType: FieldType | ContractSchema,
): string | null {
  if (typeof itemType === 'object') {
    // Nested schema for array items
    if (typeof value !== 'object' || value === null) {
      return `${path} expected object, got ${typeof value}`;
    }
    return validateNestedObject(path, value, itemType);
  }

  // Simple type for array items
  const field: ContractField = { type: itemType };
  return validateType(path, value, field);
}

/**
 * Validates nested object against schema
 */
function validateNestedObject(
  path: string,
  value: unknown,
  schema: ContractSchema,
): string | null {
  const obj = value as Record<string, unknown>;

  for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
    const field = fieldDef;
    const fieldValue = obj[fieldName];

    if (!field.optional && fieldValue === undefined) {
      return `${path}.${fieldName} is required but missing`;
    }

    if (fieldValue !== undefined && fieldValue !== null) {
      const error = validateType(`${path}.${fieldName}`, fieldValue, field);
      if (error) {
        return error;
      }
    }
  }

  return null;
}

/**
 * Validates that a response is valid (status code and structure)
 */
export function toBeValidResponse(
  this: jest.MatcherContext,
  received: { status: number; body: unknown },
  expectedStatus: number,
  contract?: ContractSchema,
): jest.CustomMatcherResult {
  const errors: string[] = [];

  if (received.status !== expectedStatus) {
    errors.push(`Expected status ${expectedStatus}, got ${received.status}`);
  }

  if (contract && received.body) {
    const contractResult = toMatchContract.call(this, received.body, contract);
    if (!contractResult.pass) {
      errors.push(contractResult.message());
    }
  }

  return {
    pass: errors.length === 0,
    message: () =>
      errors.length === 0
        ? 'Response is valid'
        : `Response validation failed:\n${errors.join('\n')}`,
  };
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
  // E.164 format: +[country code][number]
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(value);
}

// TypeScript declaration merging for Jest
declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchContract(contract: ContractSchema): R;
      toBeValidResponse(expectedStatus: number, contract?: ContractSchema): R;
    }
  }
}
