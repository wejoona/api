import { v4 as uuidv4 } from 'uuid';

export enum TicketCategory {
  ACCOUNT = 'account',
  TRANSACTION = 'transaction',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  KYC = 'kyc',
  SECURITY = 'security',
  TECHNICAL = 'technical',
  BILLING = 'billing',
  OTHER = 'other',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface SupportTicketProps {
  id?: string;
  userId!: string;
  subject!: string;
  category!: TicketCategory;
  priority!: TicketPriority;
  status!: TicketStatus;
  assignedTo?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  resolvedAt?: Date | null;
}

export interface CreateSupportTicketProps {
  userId!: string;
  subject!: string;
  category!: TicketCategory;
  priority?: TicketPriority;
}

export class SupportTicket {
  readonly id: string;
  readonly userId: string;
  readonly subject: string;
  readonly category: TicketCategory;
  private _priority: TicketPriority;
  private _status: TicketStatus;
  private _assignedTo: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  private _resolvedAt: Date | null;

  private constructor(props: SupportTicketProps) {
    this.id = props.id || uuidv4();
    this.userId = props.userId;
    this.subject = props.subject;
    this.category = props.category;
    this._priority = props.priority;
    this._status = props.status;
    this._assignedTo = props.assignedTo ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
    this._resolvedAt = props.resolvedAt ?? null;
  }

  get priority(): TicketPriority {
    return this._priority;
  }

  get status(): TicketStatus {
    return this._status;
  }

  get assignedTo(): string | null {
    return this._assignedTo;
  }

  get resolvedAt(): Date | null {
    return this._resolvedAt;
  }

  get isOpen(): boolean {
    return this._status === TicketStatus.OPEN;
  }

  get isResolved(): boolean {
    return (
      this._status === TicketStatus.RESOLVED ||
      this._status === TicketStatus.CLOSED
    );
  }

  get canBeModified(): boolean {
    return !this.isResolved;
  }

  assignToAgent(agentId: string): void {
    if (this.isResolved) {
      throw new Error('Cannot assign resolved ticket');
    }
    this._assignedTo = agentId;
    if (this._status === TicketStatus.OPEN) {
      this._status = TicketStatus.IN_PROGRESS;
    }
  }

  unassign(): void {
    this._assignedTo = null;
  }

  updatePriority(priority: TicketPriority): void {
    if (this.isResolved) {
      throw new Error('Cannot update priority of resolved ticket');
    }
    this._priority = priority;
  }

  updateStatus(status: TicketStatus): void {
    this._status = status;
    if (status === TicketStatus.RESOLVED) {
      this._resolvedAt = new Date();
    }
  }

  markInProgress(): void {
    if (this.isResolved) {
      throw new Error('Cannot mark resolved ticket as in progress');
    }
    this._status = TicketStatus.IN_PROGRESS;
  }

  markWaitingCustomer(): void {
    if (this.isResolved) {
      throw new Error('Cannot mark resolved ticket as waiting customer');
    }
    this._status = TicketStatus.WAITING_CUSTOMER;
  }

  resolve(): void {
    this._status = TicketStatus.RESOLVED;
    this._resolvedAt = new Date();
  }

  close(): void {
    this._status = TicketStatus.CLOSED;
    if (!this._resolvedAt) {
      this._resolvedAt = new Date();
    }
  }

  reopen(): void {
    if (this._status !== TicketStatus.RESOLVED) {
      throw new Error('Only resolved tickets can be reopened');
    }
    this._status = TicketStatus.OPEN;
    this._resolvedAt = null;
  }

  static create(props: CreateSupportTicketProps): SupportTicket {
    return new SupportTicket({
      ...props,
      priority: props.priority ?? TicketPriority.MEDIUM,
      status!: TicketStatus.OPEN,
    });
  }

  static reconstitute(props: SupportTicketProps): SupportTicket {
    return new SupportTicket(props);
  }
}
