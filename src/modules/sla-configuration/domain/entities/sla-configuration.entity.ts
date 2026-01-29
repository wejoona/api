import { v4 as uuidv4 } from 'uuid';

export enum SlaCategory {
  SUPPORT = 'support',
  KYC = 'kyc',
  TRANSACTION = 'transaction',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  SECURITY = 'security',
  ACCOUNT = 'account',
  BILLING = 'billing',
  COMPLAINT = 'complaint',
  TECHNICAL = 'technical',
  OTHER = 'other',
}

export enum SlaPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface SlaConfigurationProps {
  id?: string;
  name: string;
  category: SlaCategory;
  priority: SlaPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalationAfterMinutes?: number;
  isActive: boolean;
  businessHoursOnly: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSlaConfigurationProps {
  name: string;
  category: SlaCategory;
  priority: SlaPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalationAfterMinutes?: number;
  businessHoursOnly?: boolean;
}

export class SlaConfiguration {
  readonly id: string;
  readonly name: string;
  readonly category: SlaCategory;
  readonly priority: SlaPriority;
  readonly responseTimeMinutes: number;
  readonly resolutionTimeMinutes: number;
  readonly escalationAfterMinutes: number | null;
  private _isActive: boolean;
  readonly businessHoursOnly: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SlaConfigurationProps) {
    this.id = props.id || uuidv4();
    this.name = props.name;
    this.category = props.category;
    this.priority = props.priority;
    this.responseTimeMinutes = props.responseTimeMinutes;
    this.resolutionTimeMinutes = props.resolutionTimeMinutes;
    this.escalationAfterMinutes = props.escalationAfterMinutes ?? null;
    this._isActive = props.isActive;
    this.businessHoursOnly = props.businessHoursOnly;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();

    this.validate();
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get responseTimeMs(): number {
    return this.responseTimeMinutes * 60 * 1000;
  }

  get resolutionTimeMs(): number {
    return this.resolutionTimeMinutes * 60 * 1000;
  }

  get escalationAfterMs(): number | null {
    return this.escalationAfterMinutes
      ? this.escalationAfterMinutes * 60 * 1000
      : null;
  }

  private validate(): void {
    if (this.responseTimeMinutes <= 0) {
      throw new Error('Response time must be positive');
    }
    if (this.resolutionTimeMinutes <= 0) {
      throw new Error('Resolution time must be positive');
    }
    if (this.responseTimeMinutes > this.resolutionTimeMinutes) {
      throw new Error('Response time cannot exceed resolution time');
    }
    if (
      this.escalationAfterMinutes &&
      this.escalationAfterMinutes > this.resolutionTimeMinutes
    ) {
      throw new Error('Escalation time cannot exceed resolution time');
    }
  }

  activate(): void {
    this._isActive = true;
  }

  deactivate(): void {
    this._isActive = false;
  }

  isBreachedResponse(createdAt: Date, respondedAt: Date | null): boolean {
    if (!respondedAt) {
      const now = new Date();
      const elapsedMs = now.getTime() - createdAt.getTime();
      return elapsedMs > this.responseTimeMs;
    }

    const responseTime = respondedAt.getTime() - createdAt.getTime();
    return responseTime > this.responseTimeMs;
  }

  isBreachedResolution(createdAt: Date, resolvedAt: Date | null): boolean {
    if (!resolvedAt) {
      const now = new Date();
      const elapsedMs = now.getTime() - createdAt.getTime();
      return elapsedMs > this.resolutionTimeMs;
    }

    const resolutionTime = resolvedAt.getTime() - createdAt.getTime();
    return resolutionTime > this.resolutionTimeMs;
  }

  shouldEscalate(createdAt: Date, escalatedAt: Date | null): boolean {
    if (!this.escalationAfterMinutes || escalatedAt) {
      return false;
    }

    const now = new Date();
    const elapsedMs = now.getTime() - createdAt.getTime();
    return elapsedMs > this.escalationAfterMs!;
  }

  static create(props: CreateSlaConfigurationProps): SlaConfiguration {
    return new SlaConfiguration({
      ...props,
      isActive: true,
      businessHoursOnly: props.businessHoursOnly ?? false,
    });
  }

  static reconstitute(props: SlaConfigurationProps): SlaConfiguration {
    return new SlaConfiguration(props);
  }
}
