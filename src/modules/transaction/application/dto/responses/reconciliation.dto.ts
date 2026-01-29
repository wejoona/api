import { ApiProperty } from '@nestjs/swagger';

/**
 * Balance Discrepancy DTO
 */
export class BalanceDiscrepancyDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Wallet ID',
    example: 'wallet-456',
  })
  walletId: string;

  @ApiProperty({
    description: 'Currency',
    example: 'USDC',
  })
  currency: string;

  @ApiProperty({
    description: 'Balance in Blnk ledger',
    example: '100.500000',
  })
  blnkBalance: string;

  @ApiProperty({
    description: 'Balance in database',
    example: '100.000000',
  })
  databaseBalance: string;

  @ApiProperty({
    description: 'Balance in Circle',
    example: '100.000000',
  })
  circleBalance: string;

  @ApiProperty({
    description: 'Difference between Blnk and database',
    example: '0.500000',
  })
  blnkDiff: string;

  @ApiProperty({
    description: 'Difference between Circle and database',
    example: '0.000000',
  })
  circleDiff: string;

  @ApiProperty({
    description: 'Maximum difference across all systems',
    example: '0.500000',
  })
  totalDiff: string;

  @ApiProperty({
    description: 'Timestamp of reconciliation',
    example: '2024-01-28T12:00:00Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Severity level',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'medium',
  })
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * User Reconciliation Report DTO
 */
export class UserReconciliationReportDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Wallet ID',
    example: 'wallet-456',
  })
  walletId: string;

  @ApiProperty({
    description: 'Currency',
    example: 'USDC',
  })
  currency: string;

  @ApiProperty({
    description: 'Balance in Blnk ledger',
    example: '100.000000',
  })
  blnkBalance: string;

  @ApiProperty({
    description: 'Balance in database',
    example: '100.000000',
  })
  databaseBalance: string;

  @ApiProperty({
    description: 'Balance in Circle',
    example: '100.000000',
  })
  circleBalance: string;

  @ApiProperty({
    description: 'Whether all balances match',
    example: true,
  })
  isReconciled: boolean;

  @ApiProperty({
    description: 'Discrepancy details (if not reconciled)',
    type: BalanceDiscrepancyDto,
    required: false,
  })
  discrepancy?: BalanceDiscrepancyDto;

  @ApiProperty({
    description: 'Timestamp of reconciliation',
    example: '2024-01-28T12:00:00Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Error message (if reconciliation failed)',
    example: 'Failed to fetch Circle balance',
    required: false,
  })
  error?: string;
}

/**
 * Full Reconciliation Report DTO
 */
export class FullReconciliationReportDto {
  @ApiProperty({
    description: 'Total number of wallets checked',
    example: 100,
  })
  totalWallets: number;

  @ApiProperty({
    description: 'Number of wallets successfully reconciled',
    example: 95,
  })
  reconciledWallets: number;

  @ApiProperty({
    description: 'List of discrepancies found',
    type: [BalanceDiscrepancyDto],
  })
  discrepancies: BalanceDiscrepancyDto[];

  @ApiProperty({
    description: 'List of errors encountered',
    type: [Object],
    example: [
      {
        userId: 'user-123',
        walletId: 'wallet-456',
        error: 'Wallet not found',
      },
    ],
  })
  errors: Array<{ userId: string; walletId: string; error: string }>;

  @ApiProperty({
    description: 'Timestamp of reconciliation',
    example: '2024-01-28T12:00:00Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Duration of reconciliation in milliseconds',
    example: 5432,
  })
  duration: number;
}

/**
 * Reconciliation Status DTO
 */
export class ReconciliationStatusDto {
  @ApiProperty({
    description: 'Yellow Card matching rule ID',
    example: 'rule-123',
    required: false,
  })
  yellowCardRuleId?: string;

  @ApiProperty({
    description: 'Circle matching rule ID',
    example: 'rule-456',
    required: false,
  })
  circleRuleId?: string;

  @ApiProperty({
    description: 'Whether reconciliation service is initialized',
    example: true,
  })
  initialized: boolean;
}

/**
 * Legacy Transaction Reconciliation Report DTO
 */
export class TransactionReconciliationReportDto {
  @ApiProperty({
    description: 'Data source',
    enum: ['yellowcard', 'circle'],
    example: 'circle',
  })
  source: 'yellowcard' | 'circle';

  @ApiProperty({
    description: 'Reconciliation ID',
    example: 'recon-123',
  })
  reconciliationId: string;

  @ApiProperty({
    description: 'Status of reconciliation',
    example: 'completed',
  })
  status: string;

  @ApiProperty({
    description: 'Number of matched transactions',
    example: 42,
  })
  matchedCount: number;

  @ApiProperty({
    description: 'Number of unmatched transactions',
    example: 3,
  })
  unmatchedCount: number;

  @ApiProperty({
    description: 'Timestamp of reconciliation',
    example: '2024-01-28T12:00:00Z',
  })
  timestamp: Date;
}
