import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class CreatePartDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;
}

export class UpdatePartDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;
}

export class AdjustStockDto {
  @IsNumber()
  delta!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UsePartOnWorkOrderDto {
  @IsString()
  partId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;
}

export class InstallEquipmentDto {
  @IsString()
  partId!: string;

  @IsString()
  @MinLength(1)
  serialNumber!: string;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  workOrderId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RemoveEquipmentDto {
  @IsOptional()
  @IsBoolean()
  returnToStock?: boolean;
}

export class RepairPartDto {
  @IsString()
  partId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;
}

export class RepairReplacementDto {
  @IsString()
  partId!: string;

  @IsString()
  @MinLength(1)
  serialNumber!: string;
}

export class RepairEquipmentDto {
  @IsString()
  installedEquipmentId!: string;

  @IsString()
  @MinLength(3)
  summary!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepairPartDto)
  parts?: RepairPartDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RepairReplacementDto)
  replacement?: RepairReplacementDto;
}
