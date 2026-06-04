import { Controller, Get, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';

export interface SupportedCountry {
  code: string;
  dialCode: string;
  name: string;
  nameEn: string;
  nameFr: string;
  flag: string;
  currency: string;
  defaultLocale: string;
  supportedLocales: string[];
  region: 'west_africa' | 'north_america' | 'europe' | 'africa';
  market: 'active' | 'planned';
  paymentRails: string[];
  mobileMoneyProviders: string[];
  depositMethods: string[];
  withdrawalMethods: string[];
  availability: {
    onboarding: 'open' | 'waitlist' | 'disabled';
    deposits: 'available' | 'waitlist' | 'disabled';
    withdrawals: 'available' | 'waitlist' | 'disabled';
    bankLinking: 'available' | 'waitlist' | 'disabled';
    cards: 'available' | 'waitlist' | 'disabled';
    billPayments: 'available' | 'waitlist' | 'disabled';
  };
  features: {
    usdcWallet: boolean;
    internalTransfers: boolean;
    contactDiscovery: boolean;
    mobileMoney: boolean;
    bankRails: boolean;
    virtualCards: boolean;
    billPayments: boolean;
  };
}

const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  {
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
  },
  {
    code: 'SN',
    dialCode: '+221',
    name: 'Sénégal',
    nameEn: 'Senegal',
    nameFr: 'Sénégal',
    flag: '🇸🇳',
    currency: 'XOF',
    defaultLocale: 'fr-SN',
    supportedLocales: ['fr-SN', 'en'],
    region: 'west_africa',
    market: 'planned',
    paymentRails: ['mobile_money', 'usdc'],
    mobileMoneyProviders: ['orange_money', 'wave'],
    depositMethods: ['mobile_money', 'usdc'],
    withdrawalMethods: ['mobile_money', 'usdc'],
    availability: {
      onboarding: 'waitlist',
      deposits: 'waitlist',
      withdrawals: 'waitlist',
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
  },
  {
    code: 'ML',
    dialCode: '+223',
    name: 'Mali',
    nameEn: 'Mali',
    nameFr: 'Mali',
    flag: '🇲🇱',
    currency: 'XOF',
    defaultLocale: 'fr-ML',
    supportedLocales: ['fr-ML', 'en'],
    region: 'west_africa',
    market: 'planned',
    paymentRails: ['mobile_money', 'usdc'],
    mobileMoneyProviders: ['orange_money', 'moov_money'],
    depositMethods: ['mobile_money', 'usdc'],
    withdrawalMethods: ['mobile_money', 'usdc'],
    availability: {
      onboarding: 'waitlist',
      deposits: 'waitlist',
      withdrawals: 'waitlist',
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
  },
  {
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
  },
];

@ApiTags('Config')
@Controller('config')
export class AppConfigController {
  constructor(
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  @Public()
  @Get('countries')
  @ApiOperation({ summary: 'Get list of supported countries' })
  @ApiResponse({ status: 200, description: 'Supported countries list' })
  getCountries(): SupportedCountry[] {
    return this.getConfiguredCountries();
  }

  private getConfiguredCountries(): SupportedCountry[] {
    const configuredCountries =
      this.configService?.get<SupportedCountry[]>('app.supportedCountries');
    if (Array.isArray(configuredCountries) && configuredCountries.length > 0) {
      return configuredCountries.map((country) => ({ ...country }));
    }

    const encodedCountries = this.configService?.get<string>(
      'SUPPORTED_COUNTRIES_JSON',
    );
    if (encodedCountries) {
      try {
        const parsed = JSON.parse(encodedCountries) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((country) => ({ ...(country as SupportedCountry) }));
        }
      } catch {
        // Invalid overrides fall back to built-in defaults.
      }
    }

    return SUPPORTED_COUNTRIES.map((country) => ({ ...country }));
  }
}
