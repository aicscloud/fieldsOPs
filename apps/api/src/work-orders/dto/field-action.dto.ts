import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NoteKind } from '@prisma/client';

export class FieldLocationDto {
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class NotePartDto {
  @IsString()
  partId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;
}

export class AddNoteDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsEnum(NoteKind)
  kind?: NoteKind;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotePartDto)
  parts?: NotePartDto[];
}

export class AddPhotoDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class UpsertChecklistItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsOptional()
  done?: boolean;
}

export class SignatureDto {
  @IsString()
  @MinLength(1)
  signerName!: string;

  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
