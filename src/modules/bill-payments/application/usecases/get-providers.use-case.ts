import { Injectable, Logger } from '@nestjs/common';
import { BillProviderRepository } from '../../infrastructure/repositories';
import {
  BillProvider,
  BillCategory,
  SupportedCountry,
  GetProvidersQuery,
} from '../../domain/types';

export interface GetProvidersInput {
  country?: SupportedCountry;
  category?: BillCategory;
}

export interface GetProvidersOutput {
  providers: BillProvider[];
  availableCountries: SupportedCountry[];
  availableCategories: BillCategory[];
}

@Injectable()
export class GetProvidersUseCase {
  private readonly logger = new Logger(GetProvidersUseCase.name);

  constructor(
    private readonly providerRepository: BillProviderRepository,
  ) {}

  async execute(input: GetProvidersInput = {}): Promise<GetProvidersOutput> {
    this.logger.debug(`Getting providers: country=${input.country}, category=${input.category}`);

    const query: GetProvidersQuery = {
      country: input.country,
      category: input.category,
      isActive: true,
    };

    const [providers, countries, categories] = await Promise.all([
      this.providerRepository.findAll(query),
      this.providerRepository.getCountries(),
      this.providerRepository.getCategories(input.country),
    ]);

    this.logger.debug(`Found ${providers.length} providers`);

    return {
      providers,
      availableCountries: countries,
      availableCategories: categories,
    };
  }
}
