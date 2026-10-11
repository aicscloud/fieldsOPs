import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { InterventionKind } from '@prisma/client';

export class CreateWorkOrderTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(InterventionKind)
  kind!: InterventionKind;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultDuration?: number;

  @IsOptional()
  @IsBoolean()
  requiresTransport?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
