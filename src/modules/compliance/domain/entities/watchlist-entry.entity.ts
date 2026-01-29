import { v4 as uuidv4 } from 'uuid';

export type WatchlistListType = 'sanctions' | 'pep' | 'adverse_media';

export interface WatchlistEntryProps {
  id?: string;
  listType: WatchlistListType;
  name: string;
  aliases?: string[];
  nationality?: string | null;
  dateOfBirth?: Date | null;
  identifiers?: Record<string, string[]>;
  source: string;
  sourceUrl?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Watchlist Entry Domain Entity
 *
 * Represents an entry in a sanctions, PEP, or adverse media watchlist.
 * Used for screening users and transactions against regulatory lists.
 *
 * Sources:
 * - OFAC SDN List (US Office of Foreign Assets Control)
 * - UN Security Council Consolidated List
 * - EU Consolidated Financial Sanctions List
 * - FATF High-Risk Jurisdictions
 * - PEP databases (World-Check, Dow Jones)
 * - Adverse media aggregators
 */
export class WatchlistEntry {
  readonly id: string;
  readonly listType: WatchlistListType;
  readonly name: string;
  readonly aliases: string[];
  readonly nationality: string | null;
  readonly dateOfBirth: Date | null;
  readonly identifiers: Record<string, string[]>;
  readonly source: string;
  readonly sourceUrl: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: WatchlistEntryProps) {
    this.id = props.id || uuidv4();
    this.listType = props.listType;
    this.name = props.name;
    this.aliases = props.aliases || [];
    this.nationality = props.nationality || null;
    this.dateOfBirth = props.dateOfBirth || null;
    this.identifiers = props.identifiers || {};
    this.source = props.source;
    this.sourceUrl = props.sourceUrl || null;
    this.isActive = props.isActive ?? true;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  static create(
    props: Omit<WatchlistEntryProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): WatchlistEntry {
    return new WatchlistEntry(props);
  }

  static fromPersistence(props: WatchlistEntryProps): WatchlistEntry {
    return new WatchlistEntry(props);
  }

  /**
   * Get all searchable names (primary name + aliases)
   */
  getAllNames(): string[] {
    return [this.name, ...this.aliases];
  }

  /**
   * Check if entry has a specific identifier type
   */
  hasIdentifierType(type: string): boolean {
    return type in this.identifiers && this.identifiers[type].length > 0;
  }

  /**
   * Get all identifiers of a specific type
   */
  getIdentifiers(type: string): string[] {
    return this.identifiers[type] || [];
  }

  /**
   * Deactivate entry (soft delete)
   */
  deactivate(): WatchlistEntry {
    return new WatchlistEntry({
      ...this,
      isActive: false,
      updatedAt: new Date(),
    });
  }
}
