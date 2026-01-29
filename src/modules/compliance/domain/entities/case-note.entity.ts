import { v4 as uuidv4 } from 'uuid';

export interface CaseNoteProps {
  id?: string;
  caseId: string;
  authorId: string;
  note: string;
  isInternal: boolean;
  createdAt?: Date;
}

/**
 * Case Note Domain Entity
 *
 * Represents a note or comment on a compliance case.
 * Notes can be internal (visible only to compliance team) or external.
 */
export class CaseNote {
  readonly id: string;
  readonly caseId: string;
  readonly authorId: string;
  readonly note: string;
  readonly isInternal: boolean;
  readonly createdAt: Date;

  private constructor(props: CaseNoteProps) {
    this.id = props.id || uuidv4();
    this.caseId = props.caseId;
    this.authorId = props.authorId;
    this.note = props.note;
    this.isInternal = props.isInternal;
    this.createdAt = props.createdAt || new Date();
  }

  /**
   * Create a new case note
   */
  static create(props: Omit<CaseNoteProps, 'id' | 'createdAt'>): CaseNote {
    return new CaseNote(props);
  }

  /**
   * Create an internal note (visible only to compliance team)
   */
  static createInternal(
    caseId: string,
    authorId: string,
    note: string,
  ): CaseNote {
    return new CaseNote({
      caseId,
      authorId,
      note,
      isInternal: true,
    });
  }

  /**
   * Create an external note (may be visible to subject)
   */
  static createExternal(
    caseId: string,
    authorId: string,
    note: string,
  ): CaseNote {
    return new CaseNote({
      caseId,
      authorId,
      note,
      isInternal: false,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: CaseNoteProps): CaseNote {
    return new CaseNote(props);
  }
}
