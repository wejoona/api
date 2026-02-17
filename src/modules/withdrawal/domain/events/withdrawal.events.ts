export class WithdrawalInitiatedEvent {
  constructor(
    public readonly withdrawalId: string,
    public readonly userId: string,
    public readonly amount: bigint,
    public readonly fiatAmount: bigint,
    public readonly currency: string,
    public readonly providerCode: string,
    public readonly phoneNumber: string,
  ) {}
}

export class WithdrawalCompletedEvent {
  constructor(
    public readonly withdrawalId: string,
    public readonly userId: string,
    public readonly amount: bigint,
    public readonly fiatAmount: bigint,
    public readonly currency: string,
    public readonly providerCode: string,
    public readonly providerReference?: string,
    public readonly blnkTransactionId?: string,
  ) {}
}

export class WithdrawalFailedEvent {
  constructor(
    public readonly withdrawalId: string,
    public readonly userId: string,
    public readonly amount: bigint,
    public readonly currency: string,
    public readonly reason: string,
    public readonly providerCode: string,
  ) {}
}
