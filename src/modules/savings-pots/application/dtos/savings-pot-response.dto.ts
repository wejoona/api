import {
  SavingsPotEntity,
  AutoDepositFrequency,
  SavingsPotStatus,
} from '../../domain/entities/savings-pot.entity';

export class SavingsPotResponseDto {
  id: string;
  walletId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: string | null;
  isLocked: boolean;
  lockUntil: string | null;
  autoDepositAmount: number | null;
  autoDepositFrequency: AutoDepositFrequency | null;
  status: SavingsPotStatus;
  progress: number;
  remainingAmount: number;
  canWithdraw: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;

  static fromEntity(entity: SavingsPotEntity): SavingsPotResponseDto {
    const dto = new SavingsPotResponseDto();
    dto.id = entity.id;
    dto.walletId = entity.walletId;
    dto.name = entity.name;
    dto.targetAmount = entity.targetAmount;
    dto.currentAmount = entity.currentAmount;
    dto.currency = entity.currency;
    dto.targetDate = entity.targetDate?.toISOString() || null;
    dto.isLocked = entity.isLocked;
    dto.lockUntil = entity.lockUntil?.toISOString() || null;
    dto.autoDepositAmount = entity.autoDepositAmount;
    dto.autoDepositFrequency = entity.autoDepositFrequency;
    dto.status = entity.status;
    dto.progress = entity.progress;
    dto.remainingAmount = entity.remainingAmount;
    dto.canWithdraw = entity.canWithdraw;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    dto.completedAt = entity.completedAt?.toISOString() || null;
    return dto;
  }
}
