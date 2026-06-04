export class BulkPaymentItemResponseDto {
  id: string;
  phone: string;
  amount: number;
  description: string | null;
  isValid: boolean;
  error: string | null;
}

export class BulkPaymentResponseDto {
  id: string;
  name: string;
  payments: BulkPaymentItemResponseDto[];
  status: string;
  createdAt: string;
  processedAt: string | null;
  totalCount: number;
  successCount: number;
  failedCount: number;
  totalAmount: number;
}

export class BulkPaymentListResponseDto {
  batches: BulkPaymentResponseDto[];
  data: BulkPaymentResponseDto[];
  available: boolean;
  status: 'available' | 'unavailable';
  reason: string | null;
}

export class FailedReportResponseDto {
  csv: string;
}
