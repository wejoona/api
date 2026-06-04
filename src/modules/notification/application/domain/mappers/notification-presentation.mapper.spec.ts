import { getNotificationPresentation } from './notification-presentation.mapper';

describe('getNotificationPresentation', () => {
  it('maps money movement notifications to transaction actions', () => {
    expect(getNotificationPresentation('transfer_received')).toEqual({
      presentationType: 'transfer',
      severity: 'success',
      action: 'open_transaction',
    });
    expect(getNotificationPresentation('transfer_failed')).toEqual({
      presentationType: 'transactionFailed',
      severity: 'critical',
      action: 'open_transaction',
    });
    expect(getNotificationPresentation('deposit_completed')).toEqual({
      presentationType: 'deposit',
      severity: 'success',
      action: 'open_transaction',
    });
    expect(getNotificationPresentation('withdrawal_pending')).toEqual({
      presentationType: 'withdrawalPending',
      severity: 'warning',
      action: 'open_transaction',
    });
  });

  it('maps security and compliance notifications to stable mobile categories', () => {
    expect(getNotificationPresentation('new_device_login')).toEqual({
      presentationType: 'newDeviceLogin',
      severity: 'critical',
      action: 'open_security',
    });
    expect(getNotificationPresentation('security_alert')).toEqual({
      presentationType: 'securityAlert',
      severity: 'critical',
      action: 'open_security',
    });
    expect(getNotificationPresentation('kyc_rejected')).toEqual({
      presentationType: 'kyc',
      severity: 'warning',
      action: 'open_kyc',
    });
  });

  it('keeps informational notifications visually low urgency', () => {
    expect(getNotificationPresentation('promotional')).toEqual({
      presentationType: 'promotion',
      severity: 'info',
      action: 'none',
    });
    expect(getNotificationPresentation('weekly_summary')).toEqual({
      presentationType: 'weeklySpendingSummary',
      severity: 'info',
      action: 'open_wallet',
    });
  });
});
