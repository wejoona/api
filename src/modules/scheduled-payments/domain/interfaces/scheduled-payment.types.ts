/**
 * Scheduled Payment Types
 * Shared types for scheduled/recurring payments
 */

// Schedule status
export type ScheduleStatus =
  | 'active' // Schedule is active and will execute
  | 'paused' // Schedule is paused by user
  | 'completed' // All occurrences completed
  | 'cancelled' // Cancelled by user
  | 'failed' // Failed too many times, suspended
  | 'expired'; // End date reached

// Execution status
export type ExecutionStatus =
  | 'pending' // Waiting to execute
  | 'processing' // Currently executing
  | 'completed' // Successfully executed
  | 'failed' // Execution failed
  | 'skipped' // Skipped (e.g., insufficient balance)
  | 'cancelled'; // Cancelled before execution

// Frequency types
export type ScheduleFrequency =
  | 'once' // One-time scheduled payment
  | 'daily' // Every day
  | 'weekly' // Every week
  | 'biweekly' // Every 2 weeks
  | 'monthly' // Every month
  | 'quarterly' // Every 3 months
  | 'yearly'; // Every year

// Payment schedule
export interface PaymentSchedule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: ScheduleStatus;

  // Payment details
  recipientId: string;
  recipientType: 'internal' | 'external' | 'merchant';
  recipientName?: string;
  recipientDetails?: {
    phone?: string;
    email?: string;
    bankAccount?: string;
    walletAddress?: string;
  };

  amount: number;
  currency: string;

  // Schedule configuration
  frequency: ScheduleFrequency;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:mm in user's timezone
  timezone: string;

  // Limits
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  remainingOccurrences?: number;

  // Execution tracking
  totalExecuted: number;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;

  // Failure handling
  failureCount: number;
  maxFailures: number;
  lastFailureReason?: string;

  // Metadata
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Payment execution record
export interface PaymentExecution {
  id: string;
  scheduleId: string;
  userId: string;
  status: ExecutionStatus;

  // Payment details
  amount: number;
  currency: string;
  recipientId: string;
  transactionId?: string;

  // Timing
  scheduledAt: Date;
  executedAt?: Date;
  completedAt?: Date;

  // Result
  failureReason?: string;
  retryCount: number;

  // Metadata
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Create schedule input
export interface CreateScheduleInput {
  userId: string;
  name: string;
  description?: string;
  recipientId: string;
  recipientType: 'internal' | 'external' | 'merchant';
  recipientName?: string;
  amount: number;
  currency: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
}

// Schedule summary
export interface ScheduleSummary {
  id: string;
  name: string;
  recipientName: string;
  amount: number;
  currency: string;
  frequency: ScheduleFrequency;
  status: ScheduleStatus;
  nextExecutionAt?: Date;
  totalExecuted: number;
}

// Upcoming payment
export interface UpcomingPayment {
  scheduleId: string;
  scheduleName: string;
  recipientName: string;
  amount: number;
  currency: string;
  scheduledAt: Date;
}

// Events
export interface ScheduleCreatedEvent {
  scheduleId: string;
  userId: string;
  recipientName: string;
  amount: number;
  currency: string;
  frequency: ScheduleFrequency;
  nextExecutionAt: Date;
}

export interface PaymentExecutedEvent {
  executionId: string;
  scheduleId: string;
  userId: string;
  recipientName: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed';
  failureReason?: string;
}

export interface LowBalanceWarningEvent {
  userId: string;
  scheduleId: string;
  scheduleName: string;
  amount: number;
  currency: string;
  currentBalance: number;
  scheduledAt: Date;
}
