import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AssignWorkOrderDto {
  @IsString()
  fieldWorkerId!: string;

  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;
}
