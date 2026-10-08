import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentKind } from '@prisma/client';

export class BillingLineDto {
  @IsString()
  label!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateBillingDocumentDto {
  @IsEnum(DocumentKind)
  kind!: DocumentKind;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  workOrderId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillingLineDto)
  lines!: BillingLineDto[];

  /** Si true, n’ajoute pas auto les pièces du stock (déjà envoyées dans lines). */
  @IsOptional()
  @IsBoolean()
  skipPartsFromWorkOrder?: boolean;
}
