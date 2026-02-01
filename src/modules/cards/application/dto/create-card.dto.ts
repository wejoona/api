import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { CardType } from '../../domain/entities/card.entity';

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  cardholderName: string;

  @IsNumber()
  @Min(10)
  @Max(10000)
  spendingLimit: number;

  @IsOptional()
  @IsEnum(['virtual', 'physical'])
  cardType?: CardType;
}

export class CreateCardResponseDto {
  id: string;
  userId: string;
  walletId: string;
  cardNumber: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  cardType: string;
  status: string;
  spendingLimit: number;
  spentAmount: number;
  currency: string;
  createdAt: string;
}
