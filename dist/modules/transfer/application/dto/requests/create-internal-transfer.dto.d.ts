export declare enum InternalTransferCurrency {
    USDC = "USDC",
    USD = "USD"
}
export declare class CreateInternalTransferDto {
    recipientPhone: string;
    amount: number;
    currency?: InternalTransferCurrency;
    note?: string;
}
