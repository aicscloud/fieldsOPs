import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

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
