export type NotificationType = 'transfer_received' | 'transfer_sent' | 'transfer_failed' | 'deposit_completed' | 'deposit_failed' | 'withdrawal_completed' | 'withdrawal_failed' | 'kyc_approved' | 'kyc_rejected' | 'low_balance' | 'system' | 'promotional';
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
