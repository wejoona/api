import { HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { throwError } from 'rxjs';
import { BillPayClientService } from './bill-pay-client.service';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

describe('BillPayClientService provider-disabled semantics', () => {
  let httpService: { get: jest.Mock; post: jest.Mock };
  let service: BillPayClientService;

  beforeEach(() => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
    };
    service = new BillPayClientService(
      httpService as unknown as HttpService,
      {
        get: jest.fn((key: string) => {
          if (key === 'billPay.baseUrl') return 'http://bill-pay.local';
          if (key === 'billPay.apiKey') return 'test-key';
          return undefined;
        }),
      } as unknown as ConfigService,
    );
  });

  it('normalizes network/downstream 5xx failures into a coded unavailable error', async () => {
    httpService.get.mockReturnValue(
      throwError(
        () =>
          new AxiosError(
            'connect ECONNREFUSED',
            'ECONNREFUSED',
            undefined,
            {},
            {
              status: HttpStatus.BAD_GATEWAY,
              statusText: 'Bad Gateway',
              headers: {},
              config: {} as any,
              data: { message: 'upstream down' },
            },
          ),
      ),
    );

    await expect(service.getProviders({ country: 'CI' })).rejects.toMatchObject(
      {
        code: ERROR_CODES.BILL_PAYMENTS_UNAVAILABLE,
        response: expect.objectContaining({
          reason: 'provider_or_feature_disabled',
          featureReason: 'bill_pay_unavailable',
          provider: 'bill-pay',
        }),
      },
    );
  });

  it('preserves downstream 4xx validation errors for mobile forms', async () => {
    httpService.post.mockReturnValue(
      throwError(
        () =>
          new AxiosError(
            'provider missing',
            'ERR_BAD_REQUEST',
            undefined,
            {},
            {
              status: HttpStatus.NOT_FOUND,
              statusText: 'Not Found',
              headers: {},
              config: {} as any,
              data: { message: 'Provider not found' },
            },
          ),
      ),
    );

    await expect(
      service.lookupBill({
        providerId: 'missing-provider',
        accountNumber: '123',
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: expect.objectContaining({
        message: 'Provider not found',
      }),
    });
  });
});
