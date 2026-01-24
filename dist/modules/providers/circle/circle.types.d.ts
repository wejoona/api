export interface CircleCreateUserRequest {
    idempotencyKey: string;
    userId: string;
}
export interface CircleUser {
    id: string;
    status: 'ENABLED' | 'DISABLED';
    createDate: string;
    updateDate: string;
}
export interface CircleCreateWalletRequest {
    idempotencyKey: string;
    userId: string;
    blockchains: string[];
    metadata?: Array<{
        name: string;
        refId: string;
    }>;
}
export interface CircleWallet {
    id: string;
    state: 'LIVE' | 'FROZEN';
    walletSetId: string;
    custodyType: 'DEVELOPER' | 'USER';
    userId: string;
    address: string;
    blockchain: string;
    accountType: string;
    updateDate: string;
    createDate: string;
}
export interface CircleWalletBalance {
    token: {
        id: string;
        name: string;
        symbol: string;
        decimals: number;
        isNative: boolean;
    };
    amount: string;
    updateDate: string;
}
export interface CircleCreateTransferRequest {
    idempotencyKey: string;
    userId?: string;
    destinationAddress: string;
    amounts: Array<{
        amount: string;
        tokenId: string;
    }>;
    feeLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    walletId: string;
}
export interface CircleTransfer {
    id: string;
    state: 'INITIATED' | 'PENDING_RISK_SCREENING' | 'DENIED' | 'QUEUED' | 'SENT' | 'CONFIRMED' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
    transactionType: 'INBOUND' | 'OUTBOUND';
    sourceAddress: string;
    destinationAddress: string;
    amounts: Array<{
        amount: string;
        tokenId: string;
    }>;
    feeLevel: string;
    fees?: Array<{
        amount: string;
        tokenId: string;
    }>;
    txHash?: string;
    blockchain: string;
    walletId: string;
    userId: string;
    createDate: string;
    updateDate: string;
}
export type CircleWebhookEventType = 'wallets.transfer.complete' | 'wallets.transfer.failed' | 'wallets.inbound.complete' | 'wallets.inbound.failed';
export interface CircleWebhookEvent {
    subscriptionId: string;
    notificationId: string;
    notificationType: CircleWebhookEventType;
    notification: {
        id: string;
        state: string;
        walletId: string;
        userId: string;
        txHash?: string;
        blockchain: string;
        amounts: Array<{
            amount: string;
            tokenId: string;
        }>;
        createDate: string;
        updateDate: string;
    };
}
export interface CircleApiResponse<T> {
    data: T;
}
export interface CircleApiError {
    code: number;
    message: string;
    errors?: Array<{
        error: string;
        message: string;
        location: string;
        invalidValue?: string;
    }>;
}
export interface CircleConfig {
    apiKey: string;
    entitySecret: string;
    baseUrl: string;
    walletSetId?: string;
    useMock: boolean;
}
export declare const CIRCLE_USDC_TOKENS: {
    readonly ETH: "eth-mainnet-usdc";
    readonly MATIC: "matic-mainnet-usdc";
    readonly SOL: "sol-mainnet-usdc";
    readonly 'ETH-SEPOLIA': "36b6931a-873a-56a8-8a27-b706b17104ee";
    readonly 'MATIC-AMOY': "matic-amoy-usdc";
};
export declare const CIRCLE_BLOCKCHAINS: {
    readonly mainnet: readonly ["ETH", "MATIC", "SOL", "AVAX", "ARB"];
    readonly testnet: readonly ["ETH-SEPOLIA", "MATIC-AMOY", "SOL-DEVNET"];
};
