export declare enum BlockchainNetwork {
    POLYGON = "polygon",
    ETHEREUM = "ethereum",
    BASE = "base"
}
export declare enum TransferCurrency {
    USD = "USD",
    USDC = "USDC"
}
export declare class ExternalTransferDto {
    toAddress: string;
    amount: number;
    currency?: TransferCurrency;
    network?: BlockchainNetwork;
}
