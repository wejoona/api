import { RetentionAction } from '../../infrastructure/orm-entities/retention-policy.orm-entity';

export interface RetentionPolicyProps {
  id?: string;
  dataType: string;
  retentionDays: number;
  action: RetentionAction;
  gracePeriodDays: number;
  isEnabled: boolean;
  description?: string | null;
  complianceRequirement?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class RetentionPolicy {
  readonly id: string;
  readonly dataType: string;
  readonly retentionDays: number;
  readonly action: RetentionAction;
  readonly gracePeriodDays: number;
  readonly isEnabled: boolean;
  readonly description: string | null;
  readonly complianceRequirement: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: Required<RetentionPolicyProps>) {
    this.id = props.id;
    this.dataType = props.dataType;
    this.retentionDays = props.retentionDays;
    this.action = props.action;
    this.gracePeriodDays = props.gracePeriodDays;
    this.isEnabled = props.isEnabled;
    this.description = props.description || null;
    this.complianceRequirement = props.complianceRequirement || null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<RetentionPolicyProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): RetentionPolicy {
    return new RetentionPolicy({
      id: '',
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: Required<RetentionPolicyProps>): RetentionPolicy {
    return new RetentionPolicy(props);
  }

  getCutoffDate(): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);
    return cutoff;
  }

  getGracePeriodCutoff(): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (this.retentionDays + this.gracePeriodDays));
    return cutoff;
  }
}
