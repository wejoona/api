export declare enum ExternalTransferNetwork {
    POLYGON = "polygon",
    ETHEREUM = "ethereum",
    AVALANCHE = "avalanche",
    BASE = "base"
}
export declare enum ExternalTransferCurrency {
    USDC = "USDC",
    USD = "USD"
}
export declare class CreateExternalTransferDto {
    recipientAddress: string;
    amount: number;
    network?: ExternalTransferNetwork;
    currency?: ExternalTransferCurrency;
    note?: string;
}
