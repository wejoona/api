import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

export interface SupportedCountry {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
  currency: string;
}

const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  { code: 'CI', dialCode: '+225', name: "Côte d'Ivoire", flag: '🇨🇮', currency: 'XOF' },
  { code: 'SN', dialCode: '+221', name: 'Sénégal', flag: '🇸🇳', currency: 'XOF' },
  { code: 'ML', dialCode: '+223', name: 'Mali', flag: '🇲🇱', currency: 'XOF' },
  { code: 'BF', dialCode: '+226', name: 'Burkina Faso', flag: '🇧🇫', currency: 'XOF' },
  { code: 'BJ', dialCode: '+229', name: 'Bénin', flag: '🇧🇯', currency: 'XOF' },
  { code: 'TG', dialCode: '+228', name: 'Togo', flag: '🇹🇬', currency: 'XOF' },
  { code: 'NE', dialCode: '+227', name: 'Niger', flag: '🇳🇪', currency: 'XOF' },
  { code: 'GW', dialCode: '+245', name: 'Guinée-Bissau', flag: '🇬🇼', currency: 'XOF' },
  { code: 'CM', dialCode: '+237', name: 'Cameroun', flag: '🇨🇲', currency: 'XAF' },
  { code: 'GH', dialCode: '+233', name: 'Ghana', flag: '🇬🇭', currency: 'GHS' },
  { code: 'NG', dialCode: '+234', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  { code: 'US', dialCode: '+1', name: 'États-Unis', flag: '🇺🇸', currency: 'USD' },
];

@ApiTags('Config')
@Controller('config')
export class AppConfigController {
  @Public()
  @Get('countries')
  @ApiOperation({ summary: 'Get list of supported countries' })
  @ApiResponse({ status: 200, description: 'Supported countries list' })
  getCountries(): SupportedCountry[] {
    return SUPPORTED_COUNTRIES;
  }
}
