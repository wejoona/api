export declare enum WalletCurrency {
    USD = "USD",
    USDC = "USDC"
}
export declare class InternalTransferDto {
    toPhone: string;
    amount: number;
    currency?: WalletCurrency;
}
