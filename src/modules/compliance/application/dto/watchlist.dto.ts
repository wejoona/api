import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
  Max,
  IsUUID,
  MaxLength,
} from 'class-validator';

export type WatchlistListType = 'sanctions' | 'pep' | 'adverse_media';
export type WatchlistMatchStatus = 'pending' | 'confirmed' | 'false_positive';

/**
 * Create Watchlist Entry DTO
 */
export class CreateWatchlistEntryDto {
  @IsEnum(['sanctions', 'pep', 'adverse_media'])
  listType: WatchlistListType;

  @IsString()
  @MaxLength(500)
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsObject()
  identifiers?: Record<string, string[]>;

  @IsString()
  @MaxLength(255)
  source: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sourceUrl?: string;
}

/**
 * Update Watchlist Entry DTO
 */
export class UpdateWatchlistEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsObject()
  identifiers?: Record<string, string[]>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Screen User Request DTO
 */
export class ScreenUserDto {
  @IsUUID()
  userId: string;
}

/**
 * Screen Transaction Request DTO
 */
export class ScreenTransactionDto {
  @IsUUID()
  senderId: string;

  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  recipientName?: string;
}

/**
 * Review Match Request DTO
 */
export class ReviewMatchDto {
  @IsEnum(['confirm', 'dismiss'])
  decision: 'confirm' | 'dismiss';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/**
 * Search Watchlist Entries Query DTO
 */
export class SearchWatchlistEntriesDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsEnum(['sanctions', 'pep', 'adverse_media'])
  listType?: WatchlistListType;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * Get Pending Matches Query DTO
 */
export class GetPendingMatchesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Bulk Import Entries DTO
 */
export class BulkImportEntriesDto {
  @IsString()
  source: string;

  @IsArray()
  entries: CreateWatchlistEntryDto[];

  @IsOptional()
  @IsBoolean()
  deactivateExisting?: boolean;
}

/**
 * Screening Result Response
 */
export interface ScreeningResultResponse {
  userId: string;
  screened: boolean;
  matchCount: number;
  highestScore: number;
  matches: Array<{
    entryId: string;
    entryName: string;
    listType: WatchlistListType;
    matchType: string;
    score: number;
    source: string;
  }>;
  blocked: boolean;
  requiresReview: boolean;
  screenedAt: string;
}

/**
 * Match Statistics Response
 */
export interface MatchStatisticsResponse {
  total: number;
  pending: number;
  confirmed: number;
  falsePositive: number;
}

/**
 * Watchlist Entry Response
 */
export interface WatchlistEntryResponse {
  id: string;
  listType: WatchlistListType;
  name: string;
  aliases: string[];
  nationality: string | null;
  dateOfBirth: string | null;
  identifiers: Record<string, string[]>;
  source: string;
  sourceUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Watchlist Match Response
 */
export interface WatchlistMatchResponse {
  id: string;
  userId: string;
  watchlistEntryId: string;
  matchScore: number;
  matchType: string;
  status: WatchlistMatchStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
  entry?: WatchlistEntryResponse;
}
