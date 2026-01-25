export type NotificationType = 'transfer_received' | 'transfer_sent' | 'transfer_failed' | 'transfer_complete' | 'deposit_completed' | 'deposit_complete' | 'deposit_failed' | 'withdrawal_completed' | 'withdrawal_complete' | 'withdrawal_failed' | 'withdrawal_pending' | 'kyc_approved' | 'kyc_rejected' | 'kyc_update' | 'low_balance' | 'system' | 'promotional' | 'new_device_login' | 'large_transaction' | 'address_whitelisted' | 'security_alert' | 'price_alert' | 'weekly_summary';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export declare class NotificationOrmEntity {
    id: string;
    userId: string;
    type: NotificationType;
    status: NotificationStatus;
    title: string;
    body: string;
    data: Record<string, unknown>;
    referenceType: string | null;
    referenceId: string | null;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
}
