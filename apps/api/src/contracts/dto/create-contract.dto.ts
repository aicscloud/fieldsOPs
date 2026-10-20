import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { InterventionKind } from '@prisma/client';

export const CONTRACT_INTERVALS = [1, 3, 6, 12] as const;

export class CreateContractDto {
  @IsString()
  customerId!: string;

  @IsString()
  siteId!: string;

  @IsOptional()
  @IsString()
  installedEquipmentId?: string;

  @IsOptional()
  @IsString()
  typeId?: string;

  @IsOptional()
  @IsEnum(InterventionKind)
  kind?: InterventionKind;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsInt()
  @IsIn([1, 3, 6, 12])
  intervalMonths!: number;

  @IsDateString()
  nextDueAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsInt()
  @IsIn([1, 3, 6, 12])
  intervalMonths?: number;

  @IsOptional()
  @IsDateString()
  nextDueAt?: string;

  @IsOptional()
  @IsString()
  typeId?: string;

  @IsOptional()
  @IsEnum(InterventionKind)
  kind?: InterventionKind;

  @IsOptional()
  @IsString()
  installedEquipmentId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
