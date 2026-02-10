export enum DepositStatus {
  INITIATED = 'initiated',
  PENDING_OTP = 'pending_otp',
  PENDING_CONFIRMATION = 'pending_confirmation',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}