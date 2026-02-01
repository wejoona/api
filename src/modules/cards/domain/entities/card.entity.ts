import { v4 as uuidv4 } from 'uuid';

export type CardType = 'virtual' | 'physical';
export type CardStatus = 'active' | 'frozen' | 'cancelled';

export interface ICard {
  id: string;
  userId: string;
  walletId: string;
  cardNumber: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  cardType: CardType;
  status: CardStatus;
  spendingLimit: number;
  spentAmount: number;
  currency: string;
  frozenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCardProps {
  userId: string;
  walletId: string;
  cardholderName: string;
  spendingLimit: number;
  cardType?: CardType;
  currency?: string;
}

export class CardEntity implements ICard {
  readonly id: string;
  readonly userId: string;
  readonly walletId: string;
  cardNumber: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  readonly cardType: CardType;
  status: CardStatus;
  spendingLimit: number;
  spentAmount: number;
  readonly currency: string;
  frozenAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: ICard) {
    this.id = props.id;
    this.userId = props.userId;
    this.walletId = props.walletId;
    this.cardNumber = props.cardNumber;
    this.cvv = props.cvv;
    this.expiryMonth = props.expiryMonth;
    this.expiryYear = props.expiryYear;
    this.cardholderName = props.cardholderName;
    this.cardType = props.cardType;
    this.status = props.status;
    this.spendingLimit = props.spendingLimit;
    this.spentAmount = props.spentAmount;
    this.currency = props.currency;
    this.frozenAt = props.frozenAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateCardProps): CardEntity {
    const now = new Date();
    const expiryYear = (now.getFullYear() + 3).toString().substring(2);

    return new CardEntity({
      id: uuidv4(),
      userId: props.userId,
      walletId: props.walletId,
      cardNumber: this.generateCardNumber(),
      cvv: this.generateCVV(),
      expiryMonth: '12',
      expiryYear: expiryYear,
      cardholderName: props.cardholderName,
      cardType: props.cardType || 'virtual',
      status: 'active',
      spendingLimit: props.spendingLimit,
      spentAmount: 0,
      currency: props.currency || 'USD',
      frozenAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ICard): CardEntity {
    return new CardEntity(props);
  }

  private static generateCardNumber(): string {
    // Generate a realistic card number (starts with 4532 for Visa)
    const part1 = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const part2 = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const part3 = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `4532${part1}${part2}${part3}`;
  }

  private static generateCVV(): string {
    return Math.floor(Math.random() * 900 + 100).toString();
  }

  freeze(): void {
    if (this.status === 'cancelled') {
      throw new Error('Cannot freeze a cancelled card');
    }
    this.status = 'frozen';
    this.frozenAt = new Date();
    this.updatedAt = new Date();
  }

  unfreeze(): void {
    if (this.status !== 'frozen') {
      throw new Error('Card is not frozen');
    }
    this.status = 'active';
    this.frozenAt = null;
    this.updatedAt = new Date();
  }

  cancel(): void {
    this.status = 'cancelled';
    this.updatedAt = new Date();
  }

  updateSpendingLimit(newLimit: number): void {
    if (newLimit < 10) {
      throw new Error('Spending limit must be at least $10');
    }
    if (newLimit > 10000) {
      throw new Error('Spending limit cannot exceed $10,000');
    }
    this.spendingLimit = newLimit;
    this.updatedAt = new Date();
  }

  recordTransaction(amount: number): void {
    if (this.status !== 'active') {
      throw new Error('Card is not active');
    }
    if (this.spentAmount + amount > this.spendingLimit) {
      throw new Error('Transaction would exceed spending limit');
    }
    this.spentAmount += amount;
    this.updatedAt = new Date();
  }

  get isActive(): boolean {
    return this.status === 'active';
  }

  get isFrozen(): boolean {
    return this.status === 'frozen';
  }

  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  get remainingLimit(): number {
    return this.spendingLimit - this.spentAmount;
  }

  get maskedCardNumber(): string {
    // Return last 4 digits only
    return `****${this.cardNumber.slice(-4)}`;
  }
}
