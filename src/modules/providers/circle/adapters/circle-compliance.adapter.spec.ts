import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { throwError } from 'rxjs';
import { CircleComplianceAdapter } from './circle-compliance.adapter';

describe('CircleComplianceAdapter', () => {
  function makeAdapter(values: Record<string, unknown>, httpPost: jest.Mock) {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return key in values ? values[key] : defaultValue;
      }),
    } as unknown as ConfigService;

    return new CircleComplianceAdapter(configService, {
      post: httpPost,
    } as unknown as HttpService);
  }

  it('fails closed with critical risk when live address screening is unavailable', async () => {
    const adapter = makeAdapter(
      {
        'circle.apiUrl': 'https://circle.test',
        'circle.apiKey': 'circle-key',
        'circle.complianceEnabled': true,
      },
      jest.fn().mockReturnValue(throwError(() => new Error('network down'))),
    );

    await expect(
      adapter.screenAddress({
        address: '0x' + 'a'.repeat(40),
        chain: 'MATIC',
      }),
    ).resolves.toMatchObject({
      decision: 'DENIED',
      riskSignals: [
        expect.objectContaining({
          category: 'OTHER',
          severity: 'CRITICAL',
        }),
      ],
    });
  });
});
