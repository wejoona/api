export interface YellowCardConfig {
    apiUrl: string;
    apiKey: string;
    secretKey: string;
    webhookSecret: string;
    useMock: boolean;
}
export interface YellowCardChannel {
    id: string;
    name: string;
    channelType: 'mobile_money' | 'bank';
    network: string;
    country: string;
    currency: string;
    minAmount: number;
    maxAmount: number;
    flatFee: number;
    percentFee: number;
    estimatedSettlementTime: string;
}
export interface YellowCardRate {
    id: string;
    sourceCurrency: string;
    destinationCurrency: string;
    buy: number;
    sell: number;
    expiresAt: string;
}
export interface YellowCardCreatePaymentRequest {
    channelId: string;
    amount: number;
    currency: string;
    destinationCurrency: string;
    destinationAddress: string;
    customerPhone?: string;
    customerEmail?: string;
    reference: string;
    metadata?: Record<string, unknown>;
}
export interface YellowCardPayment {
    id: string;
    status: 'pending' | 'awaiting_payment' | 'processing' | 'complete' | 'failed' | 'expired';
    amount: number;
    currency: string;
    destinationAmount: number;
    destinationCurrency: string;
    rate: number;
    fee: number;
    channel: {
        id: string;
        type: string;
        network: string;
    };
    paymentDetails: {
        accountNumber?: string;
        accountName?: string;
        reference: string;
        instructions: string;
        expiresAt: string;
    };
    reference: string;
    createdAt: string;
    updatedAt: string;
}
export interface YellowCardCreatePayoutRequest {
    channelId: string;
    amount: number;
    currency: string;
    destinationCurrency: string;
    destination: {
        type: 'mobile_money' | 'bank';
        network?: string;
        accountNumber: string;
        accountName: string;
        bankCode?: string;
    };
    reference: string;
    metadata?: Record<string, unknown>;
}
export interface YellowCardPayout {
    id: string;
    status: 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled';
    amount: number;
    currency: string;
    destinationAmount: number;
    destinationCurrency: string;
    rate: number;
    fee: number;
    destination: {
        type: string;
        accountNumber: string;
        accountName: string;
    };
    reference: string;
    failureReason?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}
export type YellowCardWebhookType = 'payment.pending' | 'payment.awaiting_payment' | 'payment.processing' | 'payment.complete' | 'payment.failed' | 'payment.expired' | 'payout.pending' | 'payout.processing' | 'payout.complete' | 'payout.failed';
export interface YellowCardWebhookEvent {
    id: string;
    type: YellowCardWebhookType;
    data: YellowCardPayment | YellowCardPayout;
    createdAt: string;
}
export declare const YELLOWCARD_COUNTRIES: {
    readonly CI: {
        readonly name: "Ivory Coast";
        readonly currency: "XOF";
        readonly region: "UEMOA";
    };
    readonly SN: {
        readonly name: "Senegal";
        readonly currency: "XOF";
        readonly region: "UEMOA";
    };
    readonly ML: {
        readonly name: "Mali";
        readonly currency: "XOF";
        readonly region: "UEMOA";
    };
    readonly BF: {
        readonly name: "Burkina Faso";
        readonly currency: "XOF";
        readonly region: "UEMOA";
    };
    readonly BJ: {
        readonly name: "Benin";
        readonly currency: "XOF";
        readonly region: "UEMOA";
    };
    readonly TG: {
        readonly name: "Togo";
        readonly currency: "XOF";
        readonly region: "UEMOA";
    };
    readonly NE: {
        readonly name: "Niger";
        readonly currency: "XOF";
        readonly region: "UEMOA";
    };
    readonly GW: {
        readonly name: "Guinea-Bissau";
        readonly currency: "XOF";
        readonly region: "UEMOA";
    };
};
export declare const YELLOWCARD_MOBILE_MONEY_NETWORKS: {
    readonly CI: readonly ["orange", "mtn", "wave", "moov"];
    readonly SN: readonly ["orange", "wave", "free"];
};
