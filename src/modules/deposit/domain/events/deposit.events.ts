export class DepositInitiatedEvent {
  constructor(
    public readonly depositId: string,
    public readonly userId: string,
    public readonly amount: bigint,
    public readonly currency: string,
    public readonly providerCode: string,
    public readonly paymentMethodType: string,
    public readonly phoneNumber?: string,
  ) {}
}

export class DepositCompletedEvent {
  constructor(
    public readonly depositId: string,
    public readonly userId: string,
    public readonly amount: bigint,
    public readonly currency: string,
    public readonly providerCode: string,
    public readonly providerReference?: string,
    public readonly blnkTransactionId?: string,
  ) {}
}

export class DepositFailedEvent {
  constructor(
    public readonly depositId: string,
    public readonly userId: string,
    public readonly amount: bigint,
    public readonly currency: string,
    public readonly reason: string,
    public readonly providerCode: string,
  ) {}
}