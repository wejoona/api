import { ApiProperty } from '@nestjs/swagger';

export class HourlyBreakdown {
  @ApiProperty({ example: 12 })
  hour: number;

  @ApiProperty({ example: 25 })
  count: number;
}

export class DailyBreakdown {
  @ApiProperty({ example: '2026-01-25' })
  date: string;

  @ApiProperty({ example: 15 })
  count: number;

  @ApiProperty({ example: 450.75 })
  volume: number;
}

export class MerchantAnalyticsResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  merchantId: string;

  @ApiProperty({ example: 'Cafe Abidjan' })
  merchantName: string;

  @ApiProperty({ example: 'month' })
  period: 'day' | 'week' | 'month' | 'year';

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2026-01-31T23:59:59.999Z' })
  endDate: Date;

  @ApiProperty({ example: 150 })
  totalTransactions: number;

  @ApiProperty({ example: 4500.75 })
  totalVolume: number;

  @ApiProperty({ example: 67.51 })
  totalFees: number;

  @ApiProperty({ example: 30.00 })
  averageTransactionSize: number;

  @ApiProperty({ example: 85 })
  uniqueCustomers: number;

  @ApiProperty({ example: 'USDC' })
  currency: string;

  @ApiProperty({ type: [HourlyBreakdown], description: 'Top 5 busiest hours' })
  topHours: HourlyBreakdown[];

  @ApiProperty({ type: [DailyBreakdown], description: 'Daily transaction breakdown' })
  transactionsByDay: DailyBreakdown[];
}
