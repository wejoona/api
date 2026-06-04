/**
 * Contact Contract Tests
 *
 * Validates that contact API responses match mobile app expectations.
 */

import {
  ContactSchema,
  ContactListResponseSchema,
  CheckContactsRequestSchema,
  CheckContactsResponseSchema,
  SyncContactsRequestSchema,
  SyncContactsResponseSchema,
} from '../schemas/contact.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Contact Contracts', () => {
  describe('Contact Schema', () => {
    it('should validate complete JoonaPay user contact', () => {
      const contact = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Amadou Diallo',
        phone: '+2250701234567',
        walletAddress: null,
        username: 'amadou_diallo',
        isFavorite: true,
        transactionCount: 5,
        lastTransactionAt: '2026-01-20T12:00:00.000Z',
        isJoonaPayUser: true,
      };

      const result = validateSchema(contact, ContactSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate external wallet contact', () => {
      const contact = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'External Wallet',
        phone: null,
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        username: null,
        isFavorite: false,
        transactionCount: 2,
        lastTransactionAt: '2026-01-15T10:00:00.000Z',
        isJoonaPayUser: false,
      };

      const result = validateSchema(contact, ContactSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate new contact with no transactions', () => {
      const contact = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'New Contact',
        phone: '+2250707654321',
        walletAddress: null,
        username: null,
        isFavorite: false,
        transactionCount: 0,
        lastTransactionAt: null,
        isJoonaPayUser: false,
      };

      const result = validateSchema(contact, ContactSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if id is not a UUID', () => {
      const contact = {
        id: 'not-a-uuid',
        name: 'Test Contact',
        phone: '+2250701234567',
        walletAddress: null,
        username: null,
        isFavorite: false,
        transactionCount: 0,
        lastTransactionAt: null,
        isJoonaPayUser: false,
      };

      const result = validateSchema(contact, ContactSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'id', message: 'Expected UUID' }),
      );
    });

    it('should fail if phone is not E.164 format when present', () => {
      const contact = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Contact',
        phone: '0701234567', // Invalid format
        walletAddress: null,
        username: null,
        isFavorite: false,
        transactionCount: 0,
        lastTransactionAt: null,
        isJoonaPayUser: false,
      };

      const result = validateSchema(contact, ContactSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'phone' }),
      );
    });

    it('should fail if transactionCount is not a number', () => {
      const contact = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Contact',
        phone: '+2250701234567',
        walletAddress: null,
        username: null,
        isFavorite: false,
        transactionCount: '5', // Should be number
        lastTransactionAt: null,
        isJoonaPayUser: false,
      };

      const result = validateSchema(contact, ContactSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('GET /contacts - Contact List Response', () => {
    it('should validate contact list with multiple contacts', () => {
      const response = {
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
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Fatou Traore',
            phone: '+2250707654321',
            walletAddress: null,
            username: null,
            isFavorite: false,
            transactionCount: 2,
            lastTransactionAt: '2026-01-18T15:30:00.000Z',
            isJoonaPayUser: true,
          },
        ],
        total: 2,
      };

      const result = validateSchema(response, ContactListResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate empty contact list', () => {
      const response = {
        contacts: [],
        total: 0,
      };

      const result = validateSchema(response, ContactListResponseSchema);
      expect(result.valid).toBe(true);
    });

    it('should fail if total is missing', () => {
      const response = {
        contacts: [],
      };

      const result = validateSchema(response, ContactListResponseSchema);
      expect(result.valid).toBe(false);
    });

    it('should fail if contact in array is invalid', () => {
      const response = {
        contacts: [
          {
            id: 'not-a-uuid',
            name: 'Invalid Contact',
            // Missing other required fields
          },
        ],
        total: 1,
      };

      const result = validateSchema(response, ContactListResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('GET /contacts/favorites - Favorites Response', () => {
    it('should validate favorites list', () => {
      const response = {
        contacts: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Amadou Diallo',
            phone: '+2250701234567',
            walletAddress: null,
            username: 'amadou_diallo',
            isFavorite: true, // All should be true
            transactionCount: 10,
            lastTransactionAt: '2026-01-20T12:00:00.000Z',
            isJoonaPayUser: true,
          },
        ],
        total: 1,
      };

      const result = validateSchema(response, ContactListResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('GET /contacts/recents - Recents Response', () => {
    it('should validate recents list sorted by lastTransactionAt', () => {
      const response = {
        contacts: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Recent 1',
            phone: '+2250701234567',
            walletAddress: null,
            username: null,
            isFavorite: false,
            transactionCount: 1,
            lastTransactionAt: '2026-01-20T12:00:00.000Z',
            isJoonaPayUser: true,
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Recent 2',
            phone: '+2250707654321',
            walletAddress: null,
            username: null,
            isFavorite: false,
            transactionCount: 1,
            lastTransactionAt: '2026-01-19T10:00:00.000Z',
            isJoonaPayUser: true,
          },
        ],
        total: 2,
      };

      const result = validateSchema(response, ContactListResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('POST /contacts - Create Contact Response', () => {
    it('should validate newly created contact', () => {
      const contact = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'New Contact',
        phone: '+2250701234567',
        walletAddress: null,
        username: null,
        isFavorite: false,
        transactionCount: 0,
        lastTransactionAt: null,
        isJoonaPayUser: true,
      };

      const result = validateSchema(contact, ContactSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('PUT /contacts/:id - Update Contact Response', () => {
    it('should validate updated contact', () => {
      const contact = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Name',
        phone: '+2250701234567',
        walletAddress: null,
        username: 'amadou_diallo',
        isFavorite: true, // Changed to favorite
        transactionCount: 5,
        lastTransactionAt: '2026-01-20T12:00:00.000Z',
        isJoonaPayUser: true,
      };

      const result = validateSchema(contact, ContactSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('Mixed Contact Types', () => {
    it('should validate list with mixed contact types', () => {
      const response = {
        contacts: [
          // JoonaPay user with phone
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Amadou Diallo',
            phone: '+2250701234567',
            walletAddress: null,
            username: 'amadou_diallo',
            isFavorite: true,
            transactionCount: 10,
            lastTransactionAt: '2026-01-20T12:00:00.000Z',
            isJoonaPayUser: true,
          },
          // JoonaPay user with username only
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Fatou Traore',
            phone: null,
            walletAddress: null,
            username: 'fatou_t',
            isFavorite: false,
            transactionCount: 3,
            lastTransactionAt: '2026-01-18T10:00:00.000Z',
            isJoonaPayUser: true,
          },
          // External wallet
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            name: 'My Coinbase',
            phone: null,
            walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
            username: null,
            isFavorite: false,
            transactionCount: 2,
            lastTransactionAt: '2026-01-15T08:00:00.000Z',
            isJoonaPayUser: false,
          },
        ],
        total: 3,
      };

      const result = validateSchema(response, ContactListResponseSchema);
      expect(result.valid).toBe(true);
    });
  });

  describe('POST /contacts/check - Registered Contact Lookup', () => {
    it('should validate granted hashed lookup request', () => {
      const request = {
        permissionStatus: 'granted',
        phoneHashes: ['a'.repeat(64), 'b'.repeat(64)],
      };

      const result = validateSchema(request, CheckContactsRequestSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate denied permission request without contact data', () => {
      const request = {
        permissionStatus: 'denied',
      };

      const result = validateSchema(request, CheckContactsRequestSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate hashed lookup response without raw phone numbers', () => {
      const response = {
        totalChecked: 2,
        registered: [
          {
            phoneHash: 'a'.repeat(64),
            maskedPhone: '+22507****71',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            displayName: 'Ama Kone',
            avatarUrl: null,
            isKoridoUser: true,
          },
        ],
      };

      const result = validateSchema(response, CheckContactsResponseSchema);
      expect(result.valid).toBe(true);
      expect(JSON.stringify(response)).not.toContain('+2250701234571');
    });

    it('should fail if phoneHash is missing from a registered match', () => {
      const response = {
        totalChecked: 1,
        registered: [
          {
            maskedPhone: '+22507****71',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            displayName: 'Ama Kone',
            avatarUrl: null,
            isKoridoUser: true,
          },
        ],
      };

      const result = validateSchema(response, CheckContactsResponseSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('POST /contacts/sync - Primary Mobile Contact Sync', () => {
    it('should validate hashed sync request without raw phone numbers', () => {
      const request = {
        phoneHashes: ['a'.repeat(64), 'b'.repeat(64)],
      };

      const result = validateSchema(request, SyncContactsRequestSchema);
      expect(result.valid).toBe(true);
      expect(JSON.stringify(request)).not.toContain('+2250701234571');
    });

    it('should validate sync response with hash matches only', () => {
      const response = {
        matches: [
          {
            phoneHash: 'a'.repeat(64),
            userId: 'user_amadou_123',
            avatarUrl: null,
          },
        ],
        totalChecked: 2,
        matchesFound: 1,
      };

      const result = validateSchema(response, SyncContactsResponseSchema);
      expect(result.valid).toBe(true);
      expect(JSON.stringify(response)).not.toContain('+2250701234571');
    });

    it('should fail if a sync match omits phoneHash', () => {
      const response = {
        matches: [
          {
            userId: 'user_amadou_123',
            avatarUrl: null,
          },
        ],
        totalChecked: 1,
        matchesFound: 1,
      };

      const result = validateSchema(response, SyncContactsResponseSchema);
      expect(result.valid).toBe(false);
    });
  });
});
