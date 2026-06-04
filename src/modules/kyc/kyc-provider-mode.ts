import { ConfigService } from '@nestjs/config';

export type KycVerificationProviderMode = 'verifyhq' | 'mock';

export function resolveKycVerificationProviderMode(
  configService: ConfigService,
): KycVerificationProviderMode {
  const nodeEnv =
    configService.get<string>('nodeEnv') ||
    configService.get<string>('NODE_ENV') ||
    process.env.NODE_ENV ||
    'development';
  const productionLike = ['production', 'staging'].includes(nodeEnv);
  const configuredProvider =
    configService.get<string>('KYC_PROVIDER') ||
    configService.get<string>('kyc.provider', 'mock') ||
    'mock';
  const apiKey = configService.get<string>('VERIFY_HQ_API_KEY');
  const verifyHqConfigured = Boolean(apiKey && apiKey !== 'your-api-key-here');

  if (configuredProvider === 'mock') {
    if (productionLike) {
      throw new Error(
        'KYC_PROVIDER=mock is not allowed in production-like environments',
      );
    }
    return 'mock';
  }

  if (configuredProvider !== 'verifyhq') {
    if (productionLike) {
      throw new Error(
        `Unsupported KYC_PROVIDER for production: ${configuredProvider}`,
      );
    }
    return 'mock';
  }

  if (!verifyHqConfigured) {
    if (productionLike) {
      throw new Error(
        'KYC_PROVIDER=verifyhq requires VERIFY_HQ_API_KEY in production-like environments',
      );
    }
    return 'mock';
  }

  return 'verifyhq';
}
