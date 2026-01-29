import { v4 as uuidv4 } from 'uuid';

export type SavingsPotStatus = 'active' | 'completed' | 'cancelled';
export type AutoDepositFrequency = 'daily' | 'weekly' | 'monthly';

export interface ISavingsPot {
  id!: string;
  walletId!: string;
  name!: string;
  targetAmount!: number;
  currentAmount!: number;
  currency!: string;
  targetDate!: Date | null;
  isLocked!: boolean;
  lockUntil!: Date | null;
  autoDepositAmount!: number | null;
  autoDepositFrequency!: AutoDepositFrequency | null;
  status!: SavingsPotStatus;
  createdAt!: Date;
  updatedAt!: Date;
  completedAt!: Date | null;
}

export interface CreateSavingsPotProps {
  walletId!: string;
  name!: string;
  targetAmount!: number;
  currency?: string;
  targetDate?: Date;
  isLocked?: boolean;
  lockUntil?: Date;
  autoDepositAmount?: number;
  autoDepositFrequency?: AutoDepositFrequency;
}

export class SavingsPotEntity implements ISavingsPot {
  readonly id: string;
  readonly walletId: string;
  name!: string;
  targetAmount!: number;
  currentAmount!: number;
  readonly currency: string;
  targetDate!: Date | null;
  isLocked!: boolean;
  lockUntil!: Date | null;
  autoDepositAmount!: number | null;
  autoDepositFrequency!: AutoDepositFrequency | null;
  status!: SavingsPotStatus;
  readonly createdAt: Date;
  updatedAt!: Date;
  completedAt!: Date | null;

  private constructor(props: ISavingsPot) {
    this.id = props.id;
    this.walletId = props.walletId;
    this.name = props.name;
    this.targetAmount = props.targetAmount;
    this.currentAmount = props.currentAmount;
    this.currency = props.currency;
    this.targetDate = props.targetDate;
    this.isLocked = props.isLocked;
    this.lockUntil = props.lockUntil;
    this.autoDepositAmount = props.autoDepositAmount;
    this.autoDepositFrequency = props.autoDepositFrequency;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.completedAt = props.completedAt;
  }

  static create(props: CreateSavingsPotProps): SavingsPotEntity {
    const now = new Date();
    return new SavingsPotEntity({
      id!: uuidv4(),
      walletId!: props.walletId,
      name: props.name,
      targetAmount: props.targetAmount,
      currentAmount: 0,
      currency: props.currency || 'USDC',
      targetDate: props.targetDate || null,
      isLocked: props.isLocked || false,
      lockUntil: props.lockUntil || null,
      autoDepositAmount: props.autoDepositAmount || null,
      autoDepositFrequency: props.autoDepositFrequency || null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });
  }

  static reconstitute(props: ISavingsPot): SavingsPotEntity {
    return new SavingsPotEntity(props);
  }

  deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }
    if (this.status !== 'active') {
      throw new Error('Cannot deposit to a non-active savings pot');
    }
    this.currentAmount += amount;
    this.updatedAt = new Date();

    // Check if target reached
    if (this.currentAmount >= this.targetAmount) {
      this.complete();
    }
  }

  withdraw(amount: number): void {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }
    if (this.status !== 'active') {
      throw new Error('Cannot withdraw from a non-active savings pot');
    }
    if (this.isLocked && this.lockUntil && new Date() < this.lockUntil) {
      throw new Error('Savings pot is locked until ' + this.lockUntil.toISOString());
    }
    if (this.currentAmount < amount) {
      throw new Error('Insufficient balance in savings pot');
    }
    this.currentAmount -= amount;
    this.updatedAt = new Date();
  }

  withdrawAll(): number {
    const amount = this.currentAmount;
    if (this.isLocked && this.lockUntil && new Date() < this.lockUntil) {
      throw new Error('Savings pot is locked until ' + this.lockUntil.toISOString());
    }
    this.currentAmount = 0;
    this.updatedAt = new Date();
    return amount;
  }

  updateName(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  updateTargetAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Target amount must be positive');
    }
    this.targetAmount = amount;
    this.updatedAt = new Date();

    // Revert to active if currently completed but new target is higher
    if (this.status === 'completed' && this.currentAmount < this.targetAmount) {
      this.status = 'active';
      this.completedAt = null;
    }
  }

  updateTargetDate(date: Date | null): void {
    this.targetDate = date;
    this.updatedAt = new Date();
  }

  setAutoDeposit(amount: number | null, frequency: AutoDepositFrequency | null): void {
    if (amount !== null && amount <= 0) {
      throw new Error('Auto deposit amount must be positive');
    }
    if ((amount === null) !== (frequency === null)) {
      throw new Error('Both amount and frequency must be set together or both null');
    }
    this.autoDepositAmount = amount;
    this.autoDepositFrequency = frequency;
    this.updatedAt = new Date();
  }

  lock(until: Date): void {
    if (until <= new Date()) {
      throw new Error('Lock date must be in the future');
    }
    this.isLocked = true;
    this.lockUntil = until;
    this.updatedAt = new Date();
  }

  unlock(): void {
    this.isLocked = false;
    this.lockUntil = null;
    this.updatedAt = new Date();
  }

  complete(): void {
    this.status = 'completed';
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  cancel(): void {
    this.status = 'cancelled';
    this.updatedAt = new Date();
  }

  get isActive(): boolean {
    return this.status === 'active';
  }

  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  get progress(): number {
    if (this.targetAmount === 0) return 100;
    return Math.min(100, (this.currentAmount / this.targetAmount) * 100);
  }

  get remainingAmount(): number {
    return Math.max(0, this.targetAmount - this.currentAmount);
  }

  get canWithdraw(): boolean {
    if (this.status !== 'active') return false;
    if (this.currentAmount <= 0) return false;
    if (this.isLocked && this.lockUntil && new Date() < this.lockUntil) return false;
    return true;
  }

  get hasAutoDeposit(): boolean {
    return this.autoDepositAmount !== null && this.autoDepositFrequency !== null;
  }
}
