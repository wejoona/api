import { v4 as uuidv4 } from 'uuid';

export interface IContact {
  id: string;
  userId: string; // Owner of this contact
  contactUserId: string | null; // If contact is a JoonaPay user
  name: string;
  phone: string | null;
  walletAddress: string | null;
  username: string | null;
  isFavorite: boolean;
  transactionCount: number;
  lastTransactionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContactProps {
  userId: string;
  name: string;
  phone?: string;
  walletAddress?: string;
  username?: string;
  contactUserId?: string;
}

export class Contact implements IContact {
  readonly id: string;
  readonly userId: string;
  contactUserId: string | null;
  name: string;
  phone: string | null;
  walletAddress: string | null;
  username: string | null;
  isFavorite: boolean;
  transactionCount: number;
  lastTransactionAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: IContact) {
    this.id = props.id;
    this.userId = props.userId;
    this.contactUserId = props.contactUserId;
    this.name = props.name;
    this.phone = props.phone;
    this.walletAddress = props.walletAddress;
    this.username = props.username;
    this.isFavorite = props.isFavorite;
    this.transactionCount = props.transactionCount;
    this.lastTransactionAt = props.lastTransactionAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateContactProps): Contact {
    const now = new Date();
    return new Contact({
      id: uuidv4(),
      userId: props.userId,
      contactUserId: props.contactUserId || null,
      name: props.name,
      phone: props.phone || null,
      walletAddress: props.walletAddress || null,
      username: props.username || null,
      isFavorite: false,
      transactionCount: 0,
      lastTransactionAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: IContact): Contact {
    return new Contact(props);
  }

  toggleFavorite(): void {
    this.isFavorite = !this.isFavorite;
    this.updatedAt = new Date();
  }

  setFavorite(isFavorite: boolean): void {
    this.isFavorite = isFavorite;
    this.updatedAt = new Date();
  }

  updateName(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  recordTransaction(): void {
    this.transactionCount += 1;
    this.lastTransactionAt = new Date();
    this.updatedAt = new Date();
  }

  linkToUser(contactUserId: string, username?: string): void {
    this.contactUserId = contactUserId;
    if (username) {
      this.username = username;
    }
    this.updatedAt = new Date();
  }

  get displayName(): string {
    if (this.username) return `@${this.username}`;
    return this.name;
  }

  get contactIdentifier(): string {
    return this.phone || this.walletAddress || this.username || this.id;
  }
}
