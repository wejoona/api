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

/** @deprecated Use CardResponseDto instead — never expose CVV in responses */
