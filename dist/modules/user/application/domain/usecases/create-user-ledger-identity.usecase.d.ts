import { EventEmitter2 } from '@nestjs/event-emitter';
import { ILedgerIdentityProvider, ILedgerProvider } from '@modules/providers/interfaces';
export interface CreateUserLedgerIdentityInput {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    country?: string;
}
export interface CreateUserLedgerIdentityOutput {
    identityId: string;
    balanceId: string;
    userId: string;
}
export declare class CreateUserLedgerIdentityUseCase {
    private readonly identityProvider;
    private readonly ledgerProvider;
    private readonly eventEmitter;
    private readonly logger;
    constructor(identityProvider: ILedgerIdentityProvider, ledgerProvider: ILedgerProvider, eventEmitter: EventEmitter2);
    execute(input: CreateUserLedgerIdentityInput): Promise<CreateUserLedgerIdentityOutput>;
}
