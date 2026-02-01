/**
 * Contract Schema Type Definitions
 *
 * These types define the structure of API contracts between mobile and backend.
 */

/**
 * Supported field types in contracts
 */
export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date', // ISO 8601 date string
  ARRAY = 'array',
  OBJECT = 'object',
  UUID = 'uuid',
  EMAIL = 'email',
  PHONE = 'phone', // E.164 format
  DECIMAL = 'decimal', // String or number representation of decimal
}

/**
 * Definition of a single field in a contract
 */
export interface ContractField {
  /** The type of the field */
  type: FieldType;

  /** Whether the field can be null */
  nullable?: boolean;

  /** Whether the field is optional (may not be present) */
  optional?: boolean;

  /** Description for documentation */
  description?: string;

  /** Example value for documentation and mocking */
  example?: unknown;

  /** Enum values if the field is constrained */
  enum?: string[];

  /** For array fields, the type of items */
  itemType?: FieldType | ContractSchema;

  /** For object fields, the nested schema */
  nestedSchema?: ContractSchema;

  /** Minimum value for numbers */
  min?: number;

  /** Maximum value for numbers */
  max?: number;

  /** Minimum length for strings */
  minLength?: number;

  /** Maximum length for strings */
  maxLength?: number;

  /** Pattern for string validation */
  pattern?: string;
}

/**
 * A complete contract schema
 */
export interface ContractSchema {
  /** Name of the contract (e.g., 'AuthResponse') */
  name: string;

  /** Description of what this contract represents */
  description?: string;

  /** The fields in this contract */
  fields: Record<string, ContractField>;

  /** Whether to fail on unexpected fields */
  strictMode?: boolean;
}

/**
 * HTTP methods supported
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * An API endpoint contract
 */
export interface EndpointContract {
  /** HTTP method */
  method: HttpMethod;

  /** Endpoint path (e.g., '/auth/login') */
  path: string;

  /** Description of the endpoint */
  description: string;

  /** Required authentication */
  auth?: 'none' | 'bearer' | 'pin-token';

  /** Request body schema (for POST, PUT, PATCH) */
  requestBody?: ContractSchema;

  /** Query parameters schema (for GET) */
  queryParams?: ContractSchema;

  /** Path parameters */
  pathParams?: Record<string, ContractField>;

  /** Required headers */
  headers?: Record<string, string>;

  /** Response contracts by status code */
  responses: Record<number, ContractSchema>;

  /** Example request for documentation */
  exampleRequest?: unknown;

  /** Example response for documentation */
  exampleResponse?: Record<number, unknown>;
}

/**
 * A group of related endpoint contracts
 */
export interface ContractGroup {
  /** Name of the API group (e.g., 'Authentication') */
  name: string;

  /** Base path for all endpoints in this group */
  basePath: string;

  /** Description of this API group */
  description?: string;

  /** The endpoints in this group */
  endpoints: EndpointContract[];
}

/**
 * Helper to create a required field
 */
export function required(
  type: FieldType,
  options?: Partial<Omit<ContractField, 'type' | 'optional'>>,
): ContractField {
  return {
    type,
    optional: false,
    nullable: false,
    ...options,
  };
}

/**
 * Helper to create an optional field
 */
export function optional(
  type: FieldType,
  options?: Partial<Omit<ContractField, 'type' | 'optional'>>,
): ContractField {
  return {
    type,
    optional: true,
    nullable: false,
    ...options,
  };
}

/**
 * Helper to create a nullable field
 */
export function nullable(
  type: FieldType,
  options?: Partial<Omit<ContractField, 'type' | 'nullable'>>,
): ContractField {
  return {
    type,
    nullable: true,
    optional: false,
    ...options,
  };
}

/**
 * Helper to create an optional and nullable field
 */
export function optionalNullable(
  type: FieldType,
  options?: Partial<Omit<ContractField, 'type' | 'optional' | 'nullable'>>,
): ContractField {
  return {
    type,
    optional: true,
    nullable: true,
    ...options,
  };
}
