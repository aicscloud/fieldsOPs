import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateWorkOrderTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

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
