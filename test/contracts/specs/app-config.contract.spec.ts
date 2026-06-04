/**
 * App Config Contract Tests
 */

import { CountryConfigSchema } from '../schemas/app-config.contract';
import { validateSchema } from '../validators/schema-validator';

describe('App Config Contracts', () => {
  describe('GET /config/countries', () => {
    it('should validate Côte d’Ivoire active market config', () => {
      const country = {
        code: 'CI',
        dialCode: '+225',
        name: "Côte d'Ivoire",
        nameEn: 'Ivory Coast',
        nameFr: "Côte d'Ivoire",
        flag: '🇨🇮',
        currency: 'XOF',
        defaultLocale: 'fr-CI',
        supportedLocales: ['fr-CI', 'en'],
        region: 'west_africa',
        market: 'active',
        paymentRails: ['mobile_money', 'usdc'],
        mobileMoneyProviders: ['orange_money', 'mtn_momo', 'wave'],
        depositMethods: ['mobile_money', 'usdc'],
        withdrawalMethods: ['mobile_money', 'usdc'],
        availability: {
          onboarding: 'open',
          deposits: 'available',
          withdrawals: 'available',
          bankLinking: 'disabled',
          cards: 'waitlist',
          billPayments: 'waitlist',
        },
        features: {
          usdcWallet: true,
          internalTransfers: true,
          contactDiscovery: true,
          mobileMoney: true,
          bankRails: false,
          virtualCards: false,
          billPayments: false,
        },
      };

      const result = validateSchema(country, CountryConfigSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate United States active market config without mobile money', () => {
      const country = {
        code: 'US',
        dialCode: '+1',
        name: 'États-Unis',
        nameEn: 'United States',
        nameFr: 'États-Unis',
        flag: '🇺🇸',
        currency: 'USD',
        defaultLocale: 'en-US',
        supportedLocales: ['en-US', 'fr'],
        region: 'north_america',
        market: 'active',
        paymentRails: ['usdc'],
        mobileMoneyProviders: [],
        depositMethods: ['usdc'],
        withdrawalMethods: ['usdc'],
        availability: {
          onboarding: 'open',
          deposits: 'available',
          withdrawals: 'available',
          bankLinking: 'waitlist',
          cards: 'waitlist',
          billPayments: 'disabled',
        },
        features: {
          usdcWallet: true,
          internalTransfers: true,
          contactDiscovery: true,
          mobileMoney: false,
          bankRails: false,
          virtualCards: false,
          billPayments: false,
        },
      };

      const result = validateSchema(country, CountryConfigSchema);
      expect(result.valid).toBe(true);
      expect(country.mobileMoneyProviders).toEqual([]);
      expect(country.features.mobileMoney).toBe(false);
      expect(country.availability.billPayments).toBe('disabled');
    });
  });
});
