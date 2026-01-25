import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Total number of users',
    example: 1250,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Number of active users',
    example: 1100,
  })
  activeUsers: number;

  @ApiProperty({
    description: 'Number of suspended users',
    example: 15,
  })
  suspendedUsers: number;

  @ApiProperty({
    description: 'Number of users with pending KYC',
    example: 45,
  })
  kycPendingUsers: number;

  @ApiProperty({
    description: 'Number of users with approved KYC',
    example: 890,
  })
  kycApprovedUsers: number;

  @ApiProperty({
    description: 'Total number of transactions',
    example: 5420,
  })
  totalTransactions: number;

  @ApiProperty({
    description: 'Number of pending transactions',
    example: 23,
  })
  pendingTransactions: number;

  @ApiProperty({
    description: 'Number of completed transactions',
    example: 5320,
  })
  completedTransactions: number;

  @ApiProperty({
    description: 'Number of failed transactions',
    example: 77,
  })
  failedTransactions: number;

  @ApiProperty({
    description: 'Total transaction volume (all time)',
    example: 125000.50,
  })
  totalVolume: number;

  @ApiProperty({
    description: 'Transaction volume for today',
    example: 2340.25,
  })
  todayVolume: number;
}

export class TransactionTimeSeriesItemDto {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2026-01-25',
  })
  date: string;

  @ApiProperty({
    description: 'Number of transactions on this date',
    example: 125,
  })
  count: number;

  @ApiProperty({
    description: 'Total volume on this date',
    example: 5420.75,
  })
  volume: number;
}

export class UserGrowthTimeSeriesItemDto {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2026-01-25',
  })
  date: string;

  @ApiProperty({
    description: 'Number of new users on this date',
    example: 15,
  })
  newUsers: number;

  @ApiProperty({
    description: 'Running total of users up to this date',
    example: 1250,
  })
  totalUsers: number;
}

export class EnhancedDashboardStatsDto extends DashboardStatsDto {
  @ApiProperty({
    description: 'Transaction time-series data for charts',
    type: [TransactionTimeSeriesItemDto],
  })
  transactionTimeSeries: TransactionTimeSeriesItemDto[];

  @ApiProperty({
    description: 'User growth time-series data for charts',
    type: [UserGrowthTimeSeriesItemDto],
  })
  userGrowthTimeSeries: UserGrowthTimeSeriesItemDto[];

  @ApiProperty({
    description: 'Transaction count by type',
    example: {
      deposit: 1250,
      withdrawal: 850,
      internal_transfer: 2340,
      external_transfer: 980,
    },
  })
  transactionsByType: Record<string, number>;

  @ApiProperty({
    description: 'Transaction count by status',
    example: {
      pending: 23,
      completed: 5320,
      failed: 77,
    },
  })
  transactionsByStatus: Record<string, number>;
}
