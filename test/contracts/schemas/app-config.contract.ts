/**
 * App configuration API contracts used by mobile for region-aware UX.
 */

import {
  ContractGroup,
  ContractSchema,
  EndpointContract,
  FieldType,
  required,
} from './types';

export const MarketAvailabilitySchema: ContractSchema = {
  name: 'MarketAvailability',
  description: 'Per-market availability states for public mobile UX gating',
  fields: {
    onboarding: required(FieldType.STRING, {
      enum: ['open', 'waitlist', 'disabled'],
      example: 'open',
    }),
    deposits: required(FieldType.STRING, {
      enum: ['available', 'waitlist', 'disabled'],
      example: 'available',
    }),
    withdrawals: required(FieldType.STRING, {
      enum: ['available', 'waitlist', 'disabled'],
      example: 'available',
    }),
    bankLinking: required(FieldType.STRING, {
      enum: ['available', 'waitlist', 'disabled'],
      example: 'disabled',
    }),
    cards: required(FieldType.STRING, {
      enum: ['available', 'waitlist', 'disabled'],
      example: 'waitlist',
    }),
    billPayments: required(FieldType.STRING, {
      enum: ['available', 'waitlist', 'disabled'],
      example: 'waitlist',
    }),
  },
};

export const MarketFeatureFlagsSchema: ContractSchema = {
  name: 'MarketFeatureFlags',
  description:
    'Public market-level feature flags used before user-specific flags load',
  fields: {
    usdcWallet: required(FieldType.BOOLEAN, { example: true }),
    internalTransfers: required(FieldType.BOOLEAN, { example: true }),
    contactDiscovery: required(FieldType.BOOLEAN, { example: true }),
    mobileMoney: required(FieldType.BOOLEAN, { example: true }),
    bankRails: required(FieldType.BOOLEAN, { example: false }),
    virtualCards: required(FieldType.BOOLEAN, { example: false }),
    billPayments: required(FieldType.BOOLEAN, { example: false }),
  },
};

export const CountryConfigSchema: ContractSchema = {
  name: 'CountryConfig',
  description: 'Supported country configuration for mobile region behavior',
  fields: {
    code: required(FieldType.STRING, {
      pattern: '^[A-Z]{2}$',
      example: 'CI',
    }),
    dialCode: required(FieldType.STRING, {
      pattern: '^\\+[0-9]+$',
      example: '+225',
    }),
    name: required(FieldType.STRING, { example: "Côte d'Ivoire" }),
    nameEn: required(FieldType.STRING, { example: 'Ivory Coast' }),
    nameFr: required(FieldType.STRING, { example: "Côte d'Ivoire" }),
    flag: required(FieldType.STRING, { example: '🇨🇮' }),
    currency: required(FieldType.STRING, {
      pattern: '^[A-Z]{3}$',
      example: 'XOF',
    }),
    defaultLocale: required(FieldType.STRING, { example: 'fr-CI' }),
    supportedLocales: required(FieldType.ARRAY, {
      itemType: FieldType.STRING,
    }),
    region: required(FieldType.STRING, {
      enum: ['west_africa', 'north_america', 'europe', 'africa'],
    }),
    market: required(FieldType.STRING, {
      enum: ['active', 'planned'],
    }),
    paymentRails: required(FieldType.ARRAY, {
      itemType: FieldType.STRING,
    }),
    mobileMoneyProviders: required(FieldType.ARRAY, {
      itemType: FieldType.STRING,
    }),
    depositMethods: required(FieldType.ARRAY, {
      itemType: FieldType.STRING,
    }),
    withdrawalMethods: required(FieldType.ARRAY, {
      itemType: FieldType.STRING,
    }),
    availability: required(FieldType.OBJECT, {
      nestedSchema: MarketAvailabilitySchema,
    }),
    features: required(FieldType.OBJECT, {
      nestedSchema: MarketFeatureFlagsSchema,
    }),
  },
};

export const GetCountriesEndpoint: EndpointContract = {
  method: 'GET',
  path: '/config/countries',
  description: 'Get supported countries and country-specific payment rails',
  auth: 'none',
  responses: {
    200: CountryConfigSchema,
  },
};

export const AppConfigContractGroup: ContractGroup = {
  name: 'App Config',
  basePath: '/config',
  description: 'Public mobile app configuration endpoints',
  endpoints: [GetCountriesEndpoint],
};
