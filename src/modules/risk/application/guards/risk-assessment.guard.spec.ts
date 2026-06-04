import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RiskAssessmentGuard,
  RiskCheckOptions,
  RISK_CHECK_KEY,
} from './risk-assessment.guard';

describe('RiskAssessmentGuard', () => {
  let guard: RiskAssessmentGuard;
  let reflector: { get: jest.Mock };
  let riskService: { checkTransaction: jest.Mock };
  let stepUpService: { isStepUpComplete: jest.Mock };
  let userRepository: { findById: jest.Mock };

  const handler = jest.fn();

  const createContext = (request: Record<string, any>): ExecutionContext =>
    ({
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      get: jest.fn((key: string) => {
        if (key === RISK_CHECK_KEY) {
          return {
            transactionType: 'withdrawal',
            amountField: 'amount',
            currencyField: 'currency',
            recipientType: 'external',
            blockchainField: 'network',
          } satisfies RiskCheckOptions;
        }
        return undefined;
      }),
    };
    riskService = {
      checkTransaction: jest.fn().mockResolvedValue({
        allowed: true,
        requiresStepUp: false,
        riskScore: 20,
        riskLevel: 'low',
        assessment: { finalDecision: 'allow' },
      }),
    };
    stepUpService = { isStepUpComplete: jest.fn() };
    userRepository = { findById: jest.fn() };

    guard = new RiskAssessmentGuard(
      reflector as unknown as Reflector,
      riskService as any,
      stepUpService as any,
      userRepository as any,
    );
  });

  it('allows low-risk mocked money movement and attaches the risk assessment', async () => {
    const request: Record<string, any> = {
      user: { id: 'user-1', firstName: 'Awa', lastName: 'Kone' },
      body: {
        amount: 25,
        currency: 'USDC',
        address: '0x' + 'a'.repeat(40),
        network: 'polygon',
      },
      headers: { 'x-device-platform': 'ios', 'x-device-id': 'device-1' },
      ip: '127.0.0.1',
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(riskService.checkTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'withdrawal',
        amount: 25,
        currency: 'USDC',
        recipientType: 'external',
        destinationAddress: request.body.address,
        blockchain: 'MATIC',
        channel: 'mobile',
        deviceFingerprint: expect.objectContaining({
          deviceId: 'device-1',
          platform: 'ios',
        }),
      }),
    );
    expect(request.riskAssessment).toMatchObject({
      allowed: true,
      riskLevel: 'low',
    });
  });

  it('blocks denied risk decisions with a stable error envelope', async () => {
    riskService.checkTransaction.mockResolvedValueOnce({
      allowed: false,
      requiresStepUp: false,
      riskScore: 92,
      riskLevel: 'critical',
      blockedReasons: ['sanctions_match'],
      assessment: { finalDecision: 'block' },
    });
    const request: Record<string, any> = {
      user: { id: 'user-1' },
      body: { amount: 100, currency: 'USDC' },
      headers: {},
    };

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'RISK_BLOCKED',
        reasons: ['sanctions_match'],
        riskScore: 92,
      }),
    });
  });

  it('does nothing when a route has no risk metadata', async () => {
    reflector.get.mockReturnValue(undefined);
    const request: Record<string, any> = {
      user: { id: 'user-1' },
      body: { amount: 100 },
      headers: {},
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(riskService.checkTransaction).not.toHaveBeenCalled();
  });
});
