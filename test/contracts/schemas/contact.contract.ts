/**
 * Contact API Contracts
 *
 * Defines the contracts for contact management endpoints used by the mobile app.
 */

import {
  ContractSchema,
  EndpointContract,
  ContractGroup,
  FieldType,
  required,
  optional,
  nullable,
} from './types';

// ============================================
// Response Schemas
// ============================================

/**
 * Single contact
 */
export const ContactSchema: ContractSchema = {
  name: 'Contact',
  description: 'Contact details',
  fields: {
    id: required(FieldType.UUID, {
      description: 'Contact ID',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    name: required(FieldType.STRING, {
      description: 'Contact name',
      example: 'Amadou Diallo',
    }),
    phone: nullable(FieldType.PHONE, {
      description: 'Phone number in E.164 format',
      example: '+2250701234567',
    }),
    walletAddress: nullable(FieldType.STRING, {
      description: 'External wallet address',
      example: '0x1234567890abcdef1234567890abcdef12345678',
    }),
    username: nullable(FieldType.STRING, {
      description: 'JoonaPay username',
      example: 'amadou_diallo',
    }),
    isFavorite: required(FieldType.BOOLEAN, {
      description: 'Whether contact is marked as favorite',
      example: true,
    }),
    transactionCount: required(FieldType.NUMBER, {
      description: 'Number of transactions with this contact',
      example: 5,
    }),
    lastTransactionAt: nullable(FieldType.DATE, {
      description: 'Last transaction timestamp',
      example: '2026-01-20T12:00:00.000Z',
    }),
    isJoonaPayUser: required(FieldType.BOOLEAN, {
      description: 'Whether contact is a JoonaPay user',
      example: true,
    }),
  },
};

/**
 * Contact list response
 */
export const ContactListResponseSchema: ContractSchema = {
  name: 'ContactListResponse',
  description: 'List of contacts',
  fields: {
    contacts: required(FieldType.ARRAY, {
      description: 'List of contacts',
      itemType: ContactSchema,
    }),
    total: required(FieldType.NUMBER, {
      description: 'Total number of contacts',
      example: 10,
    }),
  },
};

// ============================================
// Request Schemas
// ============================================

export const CreateContactRequestSchema: ContractSchema = {
  name: 'CreateContactRequest',
  description: 'Request to create a new contact',
  fields: {
    name: required(FieldType.STRING, {
      description: 'Contact name',
      example: 'Amadou Diallo',
      minLength: 1,
      maxLength: 100,
    }),
    phone: optional(FieldType.PHONE, {
      description: 'Phone number in E.164 format',
      example: '+2250701234567',
    }),
    walletAddress: optional(FieldType.STRING, {
      description: 'External wallet address',
      example: '0x1234567890abcdef1234567890abcdef12345678',
    }),
    username: optional(FieldType.STRING, {
      description: 'JoonaPay username',
      example: 'amadou_diallo',
    }),
  },
};

export const UpdateContactRequestSchema: ContractSchema = {
  name: 'UpdateContactRequest',
  description: 'Request to update a contact',
  fields: {
    name: optional(FieldType.STRING, {
      description: 'New contact name',
      example: 'Amadou Diallo',
    }),
    isFavorite: optional(FieldType.BOOLEAN, {
      description: 'Favorite status',
      example: true,
    }),
  },
};

export const SearchContactsQuerySchema: ContractSchema = {
  name: 'SearchContactsQuery',
  description: 'Query for searching contacts',
  fields: {
    query: required(FieldType.STRING, {
      description: 'Search query',
      example: 'amadou',
      minLength: 1,
    }),
  },
};

// ============================================
// Error Schemas
// ============================================

export const ContactErrorSchema: ContractSchema = {
  name: 'ContactError',
  description: 'Error response for contact endpoints',
  fields: {
    statusCode: required(FieldType.NUMBER, {
      description: 'HTTP status code',
      example: 404,
    }),
    message: required(FieldType.STRING, {
      description: 'Error message',
      example: 'Contact not found',
    }),
    error: optional(FieldType.STRING, {
      description: 'Error type',
      example: 'Not Found',
    }),
  },
};

// ============================================
// Endpoint Contracts
// ============================================

export const GetContactsEndpoint: EndpointContract = {
  method: 'GET',
  path: '/contacts',
  description: 'Get all contacts',
  auth: 'bearer',
  responses: {
    200: ContactListResponseSchema,
    401: ContactErrorSchema,
  },
  exampleResponse: {
    200: {
      contacts: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Amadou Diallo',
          phone: '+2250701234567',
          walletAddress: null,
          username: 'amadou_diallo',
          isFavorite: true,
          transactionCount: 5,
          lastTransactionAt: '2026-01-20T12:00:00.000Z',
          isJoonaPayUser: true,
        },
      ],
      total: 1,
    },
  },
};

export const GetFavoritesEndpoint: EndpointContract = {
  method: 'GET',
  path: '/contacts/favorites',
  description: 'Get favorite contacts',
  auth: 'bearer',
  responses: {
    200: ContactListResponseSchema,
  },
};

export const GetRecentsEndpoint: EndpointContract = {
  method: 'GET',
  path: '/contacts/recents',
  description: 'Get recent contacts',
  auth: 'bearer',
  responses: {
    200: ContactListResponseSchema,
  },
};

export const SearchContactsEndpoint: EndpointContract = {
  method: 'GET',
  path: '/contacts/search',
  description: 'Search contacts',
  auth: 'bearer',
  queryParams: SearchContactsQuerySchema,
  responses: {
    200: ContactListResponseSchema,
  },
};

export const CreateContactEndpoint: EndpointContract = {
  method: 'POST',
  path: '/contacts',
  description: 'Create a new contact',
  auth: 'bearer',
  requestBody: CreateContactRequestSchema,
  responses: {
    201: ContactSchema,
    400: ContactErrorSchema,
    409: ContactErrorSchema,
  },
  exampleRequest: {
    name: 'Amadou Diallo',
    phone: '+2250701234567',
  },
  exampleResponse: {
    201: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Amadou Diallo',
      phone: '+2250701234567',
      walletAddress: null,
      username: null,
      isFavorite: false,
      transactionCount: 0,
      lastTransactionAt: null,
      isJoonaPayUser: true,
    },
  },
};

export const UpdateContactEndpoint: EndpointContract = {
  method: 'PUT',
  path: '/contacts/:id',
  description: 'Update a contact',
  auth: 'bearer',
  pathParams: {
    id: required(FieldType.UUID, {
      description: 'Contact ID',
    }),
  },
  requestBody: UpdateContactRequestSchema,
  responses: {
    200: ContactSchema,
    404: ContactErrorSchema,
  },
};

export const ToggleFavoriteEndpoint: EndpointContract = {
  method: 'PUT',
  path: '/contacts/:id/favorite',
  description: 'Toggle contact favorite status',
  auth: 'bearer',
  pathParams: {
    id: required(FieldType.UUID, {
      description: 'Contact ID',
    }),
  },
  responses: {
    200: ContactSchema,
    404: ContactErrorSchema,
  },
};

export const DeleteContactEndpoint: EndpointContract = {
  method: 'DELETE',
  path: '/contacts/:id',
  description: 'Delete a contact',
  auth: 'bearer',
  pathParams: {
    id: required(FieldType.UUID, {
      description: 'Contact ID',
    }),
  },
  responses: {
    204: {
      name: 'NoContent',
      description: 'Contact deleted',
      fields: {},
    },
    404: ContactErrorSchema,
  },
};

// ============================================
// Contract Group
// ============================================

export const ContactContractGroup: ContractGroup = {
  name: 'Contacts',
  basePath: '/contacts',
  description: 'Contact management endpoints',
  endpoints: [
    GetContactsEndpoint,
    GetFavoritesEndpoint,
    GetRecentsEndpoint,
    SearchContactsEndpoint,
    CreateContactEndpoint,
    UpdateContactEndpoint,
    ToggleFavoriteEndpoint,
    DeleteContactEndpoint,
  ],
};
