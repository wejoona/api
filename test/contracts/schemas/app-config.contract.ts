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
