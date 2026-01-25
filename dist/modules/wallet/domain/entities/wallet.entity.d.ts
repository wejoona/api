export type WalletStatus = 'active' | 'suspended' | 'closed';
export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';
export interface IWallet {
    id: string;
    userId: string;
    yellowCardWalletId: string | null;
    circleWalletId: string | null;
    circleWalletAddress: string | null;
    currency: string;
    balance: number;
    kycStatus: KycStatus;
    status: WalletStatus;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateWalletProps {
    userId: string;
    yellowCardWalletId?: string;
    circleWalletId?: string;
    circleWalletAddress?: string;
    currency?: string;
}
export declare class WalletEntity implements IWallet {
    readonly id: string;
    readonly userId: string;
    yellowCardWalletId: string | null;
    circleWalletId: string | null;
    circleWalletAddress: string | null;
    readonly currency: string;
    balance: number;
    kycStatus: KycStatus;
    status: WalletStatus;
    readonly createdAt: Date;
    updatedAt: Date;
    private constructor();
    static create(props: CreateWalletProps): WalletEntity;
    static reconstitute(props: IWallet): WalletEntity;
    linkYellowCard(yellowCardWalletId: string): void;
    linkToCircle(circleWalletId: string, circleWalletAddress?: string): void;
    setCircleWalletAddress(address: string): void;
    linkProvider(providerWalletId: string): void;
    credit(amount: number): void;
    debit(amount: number): void;
    updateKycStatus(status: KycStatus): void;
    suspend(): void;
    activate(): void;
    close(): void;
    get isActive(): boolean;
    get isLinkedToYellowCard(): boolean;
    get isLinkedToCircle(): boolean;
    get isLinkedToProvider(): boolean;
    get isKycVerified(): boolean;
    get providerWalletId(): string | null;
    get depositAddress(): string | null;
}
