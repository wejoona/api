import { v4 as uuidv4 } from 'uuid';

export enum SubBusinessType {
  DEPARTMENT = 'department',
  BRANCH = 'branch',
  TEAM = 'team',
}

export enum SubBusinessStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface SubBusinessPermissions {
  canSend?: boolean;
  canReceive?: boolean;
  canViewTransactions?: boolean;
  canManageStaff?: boolean;
  [key: string]: unknown;
}

export interface SubBusinessProps {
  id?: string;
  businessId: string;
  walletId: string;
  name: string;
  description?: string | null;
  type?: SubBusinessType;
  permissions?: SubBusinessPermissions;
  spendingLimit?: number | null;
  status?: SubBusinessStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSubBusinessProps {
  businessId: string;
  walletId: string;
  name: string;
  description?: string | null;
  type?: SubBusinessType;
  permissions?: SubBusinessPermissions;
  spendingLimit?: number | null;
}

export class SubBusiness {
  readonly id: string;
  readonly businessId: string;
  readonly walletId: string;
  private _name: string;
  private _description: string | null;
  private _type: SubBusinessType;
  private _permissions: SubBusinessPermissions;
  private _spendingLimit: number | null;
  private _status: SubBusinessStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SubBusinessProps) {
    this.id = props.id || uuidv4();
    this.businessId = props.businessId;
    this.walletId = props.walletId;
    this._name = props.name;
    this._description = props.description ?? null;
    this._type = props.type ?? SubBusinessType.DEPARTMENT;
    this._permissions = props.permissions ?? {
      canSend: true,
      canReceive: true,
      canViewTransactions: true,
      canManageStaff: false,
    };
    this._spendingLimit = props.spendingLimit ?? null;
    this._status = props.status ?? SubBusinessStatus.ACTIVE;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  get name(): string {
    return this._name;
  }

  get description(): string | null {
    return this._description;
  }

  get type(): SubBusinessType {
    return this._type;
  }

  get permissions(): SubBusinessPermissions {
    return { ...this._permissions };
  }

  get spendingLimit(): number | null {
    return this._spendingLimit;
  }

  get status(): SubBusinessStatus {
    return this._status;
  }

  get isActive(): boolean {
    return this._status === SubBusinessStatus.ACTIVE;
  }

  get isInactive(): boolean {
    return this._status === SubBusinessStatus.INACTIVE;
  }

  get isSuspended(): boolean {
    return this._status === SubBusinessStatus.SUSPENDED;
  }

  updateName(name: string): void {
    this._name = name;
  }

  updateDescription(description: string | null): void {
    this._description = description;
  }

  updateType(type: SubBusinessType): void {
    this._type = type;
  }

  updatePermissions(permissions: SubBusinessPermissions): void {
    this._permissions = { ...this._permissions, ...permissions };
  }

  updateSpendingLimit(limit: number | null): void {
    this._spendingLimit = limit;
  }

  activate(): void {
    this._status = SubBusinessStatus.ACTIVE;
  }

  deactivate(): void {
    this._status = SubBusinessStatus.INACTIVE;
  }

  suspend(): void {
    this._status = SubBusinessStatus.SUSPENDED;
  }

  canSend(): boolean {
    return this.isActive && this._permissions.canSend === true;
  }

  canReceive(): boolean {
    return this.isActive && this._permissions.canReceive === true;
  }

  canManageStaff(): boolean {
    return this.isActive && this._permissions.canManageStaff === true;
  }

  static create(props: CreateSubBusinessProps): SubBusiness {
    return new SubBusiness(props);
  }

  static reconstitute(props: SubBusinessProps): SubBusiness {
    return new SubBusiness(props);
  }
}
